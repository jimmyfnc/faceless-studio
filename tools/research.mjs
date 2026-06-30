#!/usr/bin/env node
/**
 * Research: plan a topic, then research a chosen angle into a draft script.
 *
 *   npm run research -- plan   <channel> "<topic>" [--angles 5] [--episodes 6]
 *   npm run research -- brief  <channel> <slug> "<angle>"
 *   npm run research -- script <channel> <slug> <brief.json>
 *
 * Sub-commands are positional (npm forwards them reliably; bare `--flags` are
 * not). `plan`/`brief` use the pluggable LLM + search (bring your own — see
 * tools/lib/llm.mjs, search.mjs); with neither configured they print the prompt
 * to run agent-driven. `script` formats a brief.json (from the agent or any LLM)
 * into research.json + script.md — no LLM needed.
 */
import { writeFile, mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { createLlm, loadLlmConfig } from "./lib/llm.mjs";
import { createSearch, loadSearchConfig } from "./lib/search.mjs";
import {
  buildPlanPrompt,
  parsePlan,
  buildBriefPrompt,
  parseBrief,
  briefToScript,
  slugifyTopic,
} from "./lib/research.mjs";

const [cmd, ...rest] = process.argv.slice(2);
const numFlag = (name, d) => {
  const i = rest.indexOf(name);
  return i >= 0 && rest[i + 1] ? Number(rest[i + 1]) : d;
};
// Positional args = everything that isn't a `--flag` or a flag's value.
const positionals = [];
for (let i = 0; i < rest.length; i++) {
  if (rest[i].startsWith("--")) i++; // skip the flag and its value (--angles/--episodes take values)
  else positionals.push(rest[i]);
}

function usage() {
  console.error(
    "Usage:\n" +
      '  npm run research -- plan   <channel> "<topic>"\n' +
      '  npm run research -- brief  <channel> <slug> "<angle>"\n' +
      "  npm run research -- script <channel> <slug> <brief.json>",
  );
  process.exit(1);
}

if (cmd === "plan") await runPlan();
else if (cmd === "brief") await runBrief();
else if (cmd === "script") await runScript();
else usage();

/* ── plan ────────────────────────────────────────────────────────────────── */
async function runPlan() {
  const [channel, topic] = positionals;
  if (!channel || !topic) usage();
  const llm = createLlm(loadLlmConfig());
  const { system, prompt, json } = buildPlanPrompt(topic, {
    maxAngles: numFlag("--angles", 5),
    maxEpisodes: numFlag("--episodes", 6),
  });
  if (!llm.configured) {
    console.log("No LLM configured → agent-driven mode.\n");
    console.log("• In Claude Code: ask Claude to plan this topic; it will write the plan.json.");
    console.log("• Bring your own LLM: set RESEARCH_LLM_BASE_URL + RESEARCH_LLM_MODEL (+ key).\n");
    console.log("Prompt to run:\n\n=== system ===\n" + system + "\n\n=== user ===\n" + prompt + "\n");
    return;
  }
  console.log(`Planning "${topic}" with ${llm.provider} (${llm.model})…`);
  const plan = parsePlan(await llm.complete({ system, prompt, json }));
  plan.topic = plan.topic || topic;
  const dir = join("channels", channel, "research");
  await mkdir(dir, { recursive: true });
  const out = join(dir, `${slugifyTopic(topic)}.plan.json`);
  await writeFile(out, JSON.stringify(plan, null, 2) + "\n");
  console.log(`\nAssessment: ${plan.assessment.toUpperCase()} — ${plan.rationale}\n`);
  console.log("Angles:");
  plan.angles.forEach((a, i) => console.log(`  ${i + 1}. ${a.title} — ${a.hook}`));
  if (plan.series) {
    console.log(`\nSeries "${plan.series.title}": ${plan.series.rationale}`);
    plan.series.episodes.forEach((e) => console.log(`  ${String(e.order).padStart(2, "0")}. ${e.title}  [${e.slug}]`));
  }
  console.log(`\nWrote ${out}`);
}

/* ── brief ───────────────────────────────────────────────────────────────── */
async function runBrief() {
  const [channel, slug, angle] = positionals;
  if (!channel || !slug || !angle) usage();
  const search = createSearch(loadSearchConfig());
  const llm = createLlm(loadLlmConfig());
  if (!llm.configured || !search.configured) {
    const { system, prompt } = buildBriefPrompt(angle, { sources: [] });
    console.log("Agent-driven brief — do this in Claude Code (or with your own tools):\n");
    console.log(`  1. Web-search "${angle}" and collect ~6 sources as {title, url, snippet}.`);
    console.log("  2. Run the prompt below with those sources inserted.");
    console.log(`  3. Save the JSON to brief.json, then:`);
    console.log(`       npm run research -- script ${channel} ${slug} brief.json\n`);
    console.log("=== system ===\n" + system + "\n\n=== user (insert your sources) ===\n" + prompt + "\n");
    return;
  }
  console.log(`Researching "${angle}" with ${search.provider} + ${llm.provider}…`);
  const sources = await search.search(angle);
  const { system, prompt, json } = buildBriefPrompt(angle, { sources });
  const brief = parseBrief(await llm.complete({ system, prompt, json }));
  await writeBriefArtifacts(channel, slug, angle, brief, sources);
}

/* ── script (format a brief.json) ────────────────────────────────────────── */
async function runScript() {
  const [channel, slug, file] = positionals;
  if (!channel || !slug || !file) usage();
  const brief = parseBrief(await readFile(file, "utf8"));
  const sources = brief.facts.map((f) => ({ title: f.sourceTitle, url: f.sourceUrl, snippet: f.text }));
  await writeBriefArtifacts(channel, slug, "", brief, sources);
}

async function writeBriefArtifacts(channel, slug, angle, brief, sources) {
  const dir = join("channels", channel, "videos", slug);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "research.json"), JSON.stringify({ angle, brief, sources }, null, 2) + "\n");
  await writeFile(join(dir, "script.md"), briefToScript(brief));
  console.log(`Wrote ${join(dir, "script.md")} + research.json (${brief.sections.length} sections, ${brief.facts.length} facts).`);
  console.log(`Review the script, then:`);
  console.log(`  record VO → public/assets/${channel}/${slug}/vo.wav`);
  console.log(`  npm run transcribe -- ${channel} ${slug}`);
  console.log(`  npm run draft -- ${channel} ${slug}`);
}
