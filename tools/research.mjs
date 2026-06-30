#!/usr/bin/env node
/**
 * Plan a topic into a single video or a series (the front of the funnel).
 *
 *   npm run research -- <channel> "<topic>" [--angles 5] [--episodes 6]
 *   npm run research -- example-explainers "the history of money"
 *
 * With an LLM configured (bring-your-own — see tools/lib/llm.mjs) this runs
 * headless and writes channels/<channel>/research/<topic>.plan.json. With no LLM
 * (agent-driven), it prints the exact prompt to run in Claude Code or paste into
 * your own model.
 */
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { createLlm, loadLlmConfig } from "./lib/llm.mjs";
import { buildPlanPrompt, parsePlan, slugifyTopic } from "./lib/research.mjs";

const argv = process.argv.slice(2);
const [channel, topic] = argv;
if (!channel || !topic) {
  console.error('Usage: npm run research -- <channel> "<topic>" [--angles N] [--episodes N]');
  process.exit(1);
}
const numFlag = (name, dflt) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? Number(argv[i + 1]) : dflt;
};

const llm = createLlm(loadLlmConfig());
const { system, prompt, json } = buildPlanPrompt(topic, {
  maxAngles: numFlag("--angles", 5),
  maxEpisodes: numFlag("--episodes", 6),
});

if (!llm.configured) {
  console.log("No LLM configured → agent-driven mode.\n");
  console.log("• In Claude Code: ask Claude to plan this topic; it will write the plan.json.");
  console.log("• Bring your own LLM (headless): set RESEARCH_LLM_BASE_URL + RESEARCH_LLM_MODEL");
  console.log("  (+ RESEARCH_LLM_API_KEY). Local Ollama needs no key.\n");
  console.log("Prompt to run:\n\n=== system ===\n" + system + "\n\n=== user ===\n" + prompt + "\n");
  process.exit(0);
}

console.log(`Planning "${topic}" with ${llm.provider} (${llm.model})…`);
const plan = parsePlan(await llm.complete({ system, prompt, json }));
plan.topic = plan.topic || topic;

const dir = join("channels", channel, "research");
await mkdir(dir, { recursive: true });
const out = join(dir, `${slugifyTopic(topic)}.plan.json`);
await writeFile(out, JSON.stringify(plan, null, 2) + "\n");

console.log(`\nAssessment: ${plan.assessment.toUpperCase()} — ${plan.rationale}\n`);
console.log("Angles (single-video options):");
plan.angles.forEach((a, i) => console.log(`  ${i + 1}. ${a.title} — ${a.hook}`));
if (plan.series) {
  console.log(`\nSeries "${plan.series.title}": ${plan.series.rationale}`);
  plan.series.episodes.forEach((e) =>
    console.log(`  ${String(e.order).padStart(2, "0")}. ${e.title}  [${e.slug}]`),
  );
}
console.log(`\nWrote ${out}`);
