/**
 * Auto-draft: turn a script + Whisper captions into a video's props.json.
 *
 * The headline trick is alignment — each section's spoken narration is matched
 * to the caption word stream (LCS, tolerant of number-word vs numeral
 * mismatches), so section *durations are derived from the voice* rather than
 * hand-authored.
 *
 * Library-first and pure (no fs): the CLI (`tools/autodraft.mjs`) and the
 * future web app call these. All four exports are unit-tested.
 */

const KINDS = ["title", "bars", "text", "image", "video", "diagram"];
const DIAGRAM_LAYOUTS = ["flow", "steps", "stack"];

/* ── Script parsing ──────────────────────────────────────────────────────── */

/**
 * Parse a script.md into sections. A section is a `## Label (kind)` heading
 * followed by spoken narration lines and an optional `[VISUAL: ...]` line.
 * Parsing stops at a horizontal rule (`---`) or an H3 (notes).
 * @returns {Array<{label: string, kind: string, narration: string, visual: string|null}>}
 */
export function parseScript(md) {
  const sections = [];
  let cur = null;
  for (const raw of md.split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (/^##\s/.test(line) && !/^###/.test(line)) {
      const m = line.match(/^##\s+(.*?)\s*\(([a-zA-Z]+)\)\s*$/);
      if (m && KINDS.includes(m[2].toLowerCase())) {
        cur = { label: m[1].trim(), kind: m[2].toLowerCase(), narration: [], visual: null };
        sections.push(cur);
      } else {
        cur = null; // a non-scene heading ends the current section
      }
      continue;
    }
    if (/^---+\s*$/.test(line) || /^###\s/.test(line)) {
      cur = null;
      continue;
    }
    if (!cur) continue;
    const vis = line.match(/^\s*\[VISUAL:\s*(.*?)\]\s*$/i);
    if (vis) {
      cur.visual = vis[1].trim();
      continue;
    }
    if (line.trim()) cur.narration.push(line.trim());
  }
  return sections.map((s) => ({ ...s, narration: s.narration.join(" ") }));
}

/* ── [VISUAL] → scene content ────────────────────────────────────────────── */

const stripQuotes = (s) => (s ?? "").trim().replace(/^["“”']|["“”']$/g, "").trim();

/** Drop a leading freeform label (`title — `, `bars - `, `text: `) from a payload. */
function payloadOf(visual) {
  if (!visual) return "";
  const m = visual.split(/\s+[—–-]\s+|:\s+/);
  return (m.length > 1 ? m.slice(1).join(" — ") : visual).trim();
}

const splitPipe = (s) => s.split("|").map(stripQuotes);

function parsePairs(s) {
  return (s || "")
    .split(",")
    .map((p) => p.split("="))
    .filter((kv) => kv.length === 2 && kv[1].trim() !== "" && !Number.isNaN(Number(kv[1])))
    .map(([label, value]) => ({ label: label.trim(), value: Number(value) }));
}

/**
 * Build the scene-specific props for a section from its `[VISUAL]` note.
 * Formats:
 *   title: `title — "Main" | "Optional subtitle"`
 *   text:  `text — "Heading" | "Optional body"`
 *   bars:  `bars — "Heading"; Label=Value, Label=Value`
 * @returns {{ fields: object, flags: string[] }}
 */
export function sceneContent(section) {
  const flags = [];
  const payload = payloadOf(section.visual);

  if (section.kind === "title") {
    const [text, subtitle] = splitPipe(payload);
    if (!text) flags.push(`title "${section.label}": no text in [VISUAL]`);
    return { fields: { text: text || section.label, subtitle: subtitle || undefined }, flags };
  }
  if (section.kind === "text") {
    const [heading, body] = splitPipe(payload);
    if (!heading) flags.push(`text "${section.label}": no heading in [VISUAL]`);
    return { fields: { heading: heading || section.label, body: body || undefined }, flags };
  }
  if (section.kind === "bars") {
    const semi = payload.indexOf(";");
    const heading = stripQuotes(semi >= 0 ? payload.slice(0, semi) : "");
    const data = parsePairs(semi >= 0 ? payload.slice(semi + 1) : payload);
    if (!heading) flags.push(`bars "${section.label}": no heading in [VISUAL]`);
    if (!data.length) flags.push(`bars "${section.label}": no data parsed from [VISUAL]`);
    return { fields: { heading: heading || section.label, data }, flags };
  }
  if (section.kind === "image" || section.kind === "video") {
    const [src, caption] = splitPipe(payload);
    if (!src) flags.push(`${section.kind} "${section.label}": no src in [VISUAL]`);
    return { fields: { src: src || "", caption: caption || undefined }, flags };
  }
  if (section.kind === "diagram") {
    // `diagram — "Heading" | flow | "Node A; Node B*; Node C"`  (a `*` marks the active node)
    const [heading, layoutRaw, nodesRaw] = splitPipe(payload);
    const layout = DIAGRAM_LAYOUTS.includes((layoutRaw || "").toLowerCase())
      ? layoutRaw.toLowerCase()
      : "flow";
    const nodes = (nodesRaw || "")
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((label) => {
        const active = label.endsWith("*");
        return { label: active ? label.slice(0, -1).trim() : label, active };
      });
    if (!nodes.length) flags.push(`diagram "${section.label}": no nodes in [VISUAL]`);
    return { fields: { heading: heading || section.label, layout, nodes }, flags };
  }
  return { fields: {}, flags: [`unknown kind "${section.kind}"`] };
}

/* ── Alignment ───────────────────────────────────────────────────────────── */

const norm = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, "");
const tokenize = (text) => text.split(/\s+/).map(norm).filter(Boolean);

/**
 * Derive each section's frame count from the caption timings by aligning the
 * narration token stream to the caption words (LCS), then tiling the timeline.
 * @returns {{ frames: number[], reports: Array<{label: string, confidence: number, lowConfidence: boolean}> }}
 */
export function alignSectionFrames(sections, captionWords, fps, totalFrames) {
  const nTokens = [];
  sections.forEach((s, si) => tokenize(s.narration).forEach((tok) => nTokens.push({ tok, sec: si })));
  const cTokens = captionWords.map((w) => norm(w.text));
  const n = nTokens.length;
  const m = cTokens.length;

  // LCS DP (suffix lengths), then forward backtrack to collect matched pairs.
  const dp = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = nTokens[i].tok === cTokens[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const startCi = new Array(sections.length).fill(null);
  const matched = new Array(sections.length).fill(0);
  const total = new Array(sections.length).fill(0);
  nTokens.forEach((t) => (total[t.sec] += 1));
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (nTokens[i].tok === cTokens[j]) {
      const sec = nTokens[i].sec;
      matched[sec] += 1;
      if (startCi[sec] === null) startCi[sec] = j;
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      i++;
    } else {
      j++;
    }
  }

  // Section start times (ms). First section starts at 0; unmatched sections are
  // interpolated by narration word-count between located neighbours.
  const startMs = sections.map((_, si) =>
    startCi[si] === null ? null : captionWords[startCi[si]].startMs,
  );
  startMs[0] = 0;
  for (let s = 1; s < startMs.length; s++) {
    if (startMs[s] !== null) continue;
    let prev = s - 1;
    while (prev >= 0 && startMs[prev] === null) prev--;
    let next = s + 1;
    while (next < startMs.length && startMs[next] === null) next++;
    const lo = prev >= 0 ? startMs[prev] : 0;
    const hi = next < startMs.length ? startMs[next] : captionWords[m - 1]?.endMs ?? lo;
    startMs[s] = lo + ((hi - lo) * (s - prev)) / (next - prev);
  }

  // Convert to monotonic start frames, then tile to exactly totalFrames.
  const startFrame = startMs.map((ms) => Math.round((ms / 1000) * fps));
  startFrame[0] = 0;
  for (let s = 1; s < startFrame.length; s++) {
    if (startFrame[s] <= startFrame[s - 1]) startFrame[s] = startFrame[s - 1] + 1;
  }
  const frames = startFrame.map((f, s) =>
    s === startFrame.length - 1 ? Math.max(1, totalFrames - f) : Math.max(1, startFrame[s + 1] - f),
  );

  const reports = sections.map((s, si) => {
    const confidence = total[si] ? matched[si] / total[si] : 0;
    return { label: s.label, confidence, lowConfidence: confidence < 0.5 };
  });
  return { frames, reports };
}

/* ── Assemble props ──────────────────────────────────────────────────────── */

/**
 * Assemble a props.json object (validates against explainerSchema) from parsed
 * sections + caption words, with durations aligned to the voice.
 *
 * If `imagesBySection[i]` has images, that section becomes a **montage** scene
 * (the images crossfade behind the caption with the section's text as the
 * heading) — that's the dense, image-backed look. `bars` sections keep their
 * chart. Sections with no images fall back to the plain title/text card.
 * @returns {{ props: object, reports: object[], flags: string[] }}
 */
export function assembleProps({ sections, captionWords, voiceoverSrc, fps, totalFrames, imagesBySection = [] }) {
  const { frames, reports } = alignSectionFrames(sections, captionWords, fps, totalFrames);
  const props = {
    voiceoverSrc,
    sections: sections.map((s, si) => {
      const { fields } = sceneContent(s);
      // A `diagram` section is engine-drawn (accurate, no images) — it opts out
      // of the montage upgrade even when matching s<NN> images exist.
      if (s.kind === "diagram") {
        return {
          kind: "diagram",
          durationInFrames: frames[si],
          heading: fields.heading,
          layout: fields.layout,
          nodes: fields.nodes,
        };
      }
      const images = imagesBySection[si] || [];
      if (s.kind !== "bars" && images.length) {
        const heading = fields.text || fields.heading || s.label || undefined;
        return { kind: "montage", durationInFrames: frames[si], images, heading };
      }
      return { kind: s.kind, durationInFrames: frames[si], ...fields };
    }),
    captions: captionWords.map(({ text, startMs, endMs }) => ({ text, startMs, endMs })),
  };
  const flags = sections.flatMap((s) => sceneContent(s).flags);
  return { props, reports, flags };
}
