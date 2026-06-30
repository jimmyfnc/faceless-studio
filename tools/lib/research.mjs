/**
 * Research contracts + helpers (pure, LLM-agnostic).
 *
 * The funnel: topic → PLAN (single vs series + angles) → pick → BRIEF (outline +
 * facts + sources for one video) → script.md. The same prompt builders drive
 * both the agent-driven path (Claude) and a bring-your-own-LLM API path.
 */

export const slugify = (s) =>
  String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

export const slugifyTopic = slugify;

/** Ordered, prefixed episode slug, e.g. ("mars-exploration", 2, "Viking Landers") → "mars-exploration-02-viking-landers". */
export function episodeSlug(seriesSlug, order, title) {
  return `${slugify(seriesSlug)}-${String(order).padStart(2, "0")}-${slugify(title)}`;
}

function parseJsonLoose(text) {
  let t = String(text).trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  return JSON.parse(t);
}

/* ── PLAN: narrow a topic to a single video or a series ──────────────────── */

export function buildPlanPrompt(topic, { maxAngles = 5, maxEpisodes = 6 } = {}) {
  const system =
    "You are a content strategist for a faceless explainer channel. You decide " +
    "whether a topic is best as ONE focused video or a SERIES, and propose sharp " +
    "angles. Recommend a series only when the topic has 3+ distinct, self-contained " +
    "arcs that each deserve their own video. Reply with STRICT JSON only — no prose.";
  const prompt =
    `Topic: "${topic}"\n\n` +
    `Return JSON of exactly this shape:\n` +
    `{\n` +
    `  "topic": string,\n` +
    `  "assessment": "single" | "series",\n` +
    `  "rationale": string,                      // one sentence: why single or series\n` +
    `  "angles": [ { "title": string, "hook": string, "summary": string } ],  // ${maxAngles} focused single-video options\n` +
    `  "series": null | { "title": string, "rationale": string,\n` +
    `     "episodes": [ { "order": number, "title": string, "hook": string } ] }  // up to ${maxEpisodes}, only if assessment is "series"\n` +
    `}`;
  return { system, prompt, json: true };
}

export function parsePlan(text) {
  const p = parseJsonLoose(text);
  if (!p || !["single", "series"].includes(p.assessment)) {
    throw new Error('plan: missing/invalid "assessment" (expected "single" or "series")');
  }
  if (!Array.isArray(p.angles) || p.angles.length === 0) throw new Error("plan: no angles");
  if (p.assessment === "series" && (!p.series || !Array.isArray(p.series.episodes) || !p.series.episodes.length)) {
    throw new Error('plan: "series" assessment but no episodes');
  }
  return {
    topic: p.topic || "",
    assessment: p.assessment,
    rationale: p.rationale || "",
    angles: p.angles.map((a) => ({ title: a.title || "", hook: a.hook || "", summary: a.summary || "" })),
    series: p.series
      ? {
          title: p.series.title || "",
          rationale: p.series.rationale || "",
          episodes: (p.series.episodes || []).map((e, i) => ({
            order: Number(e.order ?? i + 1),
            title: e.title || "",
            hook: e.hook || "",
            slug: episodeSlug(slugify(p.series.title || p.topic || "series"), Number(e.order ?? i + 1), e.title || ""),
          })),
        }
      : null,
  };
}

/* ── BRIEF: research one chosen angle into an outline + facts ─────────────── */

export function buildBriefPrompt(angle, { sources = [] } = {}) {
  const system =
    "You are scripting one faceless explainer video. Use ONLY the provided sources " +
    "for facts; never invent statistics. Write spoken-language narration. Reply with " +
    "STRICT JSON only.";
  const sourceText = sources.length
    ? sources.map((s, i) => `[${i + 1}] ${s.title || s.url}\n${(s.snippet || "").slice(0, 600)}\n${s.url}`).join("\n\n")
    : "(no sources provided — keep claims general and mark facts that need verification)";
  const prompt =
    `Video angle: ${typeof angle === "string" ? angle : JSON.stringify(angle)}\n\n` +
    `Sources:\n${sourceText}\n\n` +
    `Return JSON:\n` +
    `{\n` +
    `  "title": string,\n` +
    `  "hook": string,\n` +
    `  "sections": [ { "kind": "title"|"text"|"bars"|"image"|"video",\n` +
    `      "label": string, "narration": string,\n` +
    `      "visual": string } ],   // visual in [VISUAL] payload form, e.g. 'title — "Main" | "Sub"'\n` +
    `  "facts": [ { "text": string, "sourceUrl": string, "sourceTitle": string } ],\n` +
    `  "assetQueries": [ string ]  // search terms for copyright-safe images\n` +
    `}`;
  return { system, prompt, json: true };
}

export function parseBrief(text) {
  const b = parseJsonLoose(text);
  if (!b || !Array.isArray(b.sections) || b.sections.length === 0) throw new Error("brief: no sections");
  return {
    title: b.title || "Untitled",
    hook: b.hook || "",
    sections: b.sections.map((s) => ({
      kind: s.kind || "text",
      label: s.label || "",
      narration: s.narration || "",
      visual: s.visual || "",
    })),
    facts: Array.isArray(b.facts) ? b.facts : [],
    assetQueries: Array.isArray(b.assetQueries) ? b.assetQueries : [],
  };
}

/** Render a brief into a script.md string that flows into `npm run draft`. */
export function briefToScript(brief) {
  const lines = [
    `# Script: ${brief.title}`,
    "",
    "> Auto-drafted by research. Spoken lines + `[VISUAL]` notes; section durations",
    "> come from the voice once you record + transcribe. Review and edit before VO.",
    "",
  ];
  for (const s of brief.sections) {
    lines.push(`## ${s.label || s.kind} (${s.kind})`, "");
    if (s.narration) lines.push(s.narration, "");
    if (s.visual) lines.push(`[VISUAL: ${s.visual}]`, "");
  }
  if (brief.facts.length) {
    lines.push("---", "", "### Sources", "");
    for (const f of brief.facts) {
      lines.push(`- ${f.sourceTitle || f.text?.slice(0, 60) || "source"}: ${f.sourceUrl || ""}`.trimEnd());
    }
    lines.push("");
  }
  return lines.join("\n");
}
