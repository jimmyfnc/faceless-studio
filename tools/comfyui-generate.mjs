#!/usr/bin/env node
/**
 * ComfyUI generation helper for the faceless-studio pipeline.
 *
 * Runs an exported ComfyUI **API-format** workflow and saves the resulting
 * images into the project's public/ folder so Remotion can reference them
 * with staticFile().
 *
 * In ComfyUI: open your workflow -> gear icon -> enable "Dev mode options"
 * -> "Save (API Format)". Save the JSON into ./workflows/.
 *
 * Usage:
 *   node tools/comfyui-generate.mjs \
 *     --workflow workflows/txt2img.json \
 *     --out public/assets/compound-interest \
 *     --prompt "isometric diagram of compounding growth, clean vector, dark bg" \
 *     [--prompt-node 6] [--seed 12345] [--seed-node 3] \
 *     [--host http://127.0.0.1:8188]
 *
 * Tip: most workflows have TWO CLIPTextEncode nodes (positive + negative).
 * Pass --prompt-node <id> to target the positive one reliably.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const args = parseArgs(process.argv.slice(2));

if (!args.workflow || !args.out) {
  console.error(
    "Usage: node tools/comfyui-generate.mjs --workflow <api.json> --out <dir> " +
      "[--prompt <text>] [--prompt-node <id>] [--seed <n>] [--seed-node <id>] [--host <url>]",
  );
  process.exit(1);
}

const HOST = String(args.host || "http://127.0.0.1:8188").replace(/\/$/, "");
const clientId = `faceless-studio-${process.pid}-${Date.now()}`;

const workflow = JSON.parse(await readFile(args.workflow, "utf8"));

if (args.prompt) {
  const node = args["prompt-node"]
    ? String(args["prompt-node"])
    : findNode(workflow, "CLIPTextEncode");
  if (!node || !workflow[node]) {
    console.error(
      "Could not find a CLIPTextEncode node. Pass --prompt-node <id> explicitly.",
    );
    process.exit(1);
  }
  workflow[node].inputs.text = String(args.prompt);
  console.log(`Set prompt on node ${node}.`);
}

if (args.seed !== undefined && args.seed !== true) {
  const node = args["seed-node"]
    ? String(args["seed-node"])
    : findNode(workflow, "KSampler");
  if (node && workflow[node]) {
    const inputs = workflow[node].inputs;
    if ("seed" in inputs) inputs.seed = Number(args.seed);
    else if ("noise_seed" in inputs) inputs.noise_seed = Number(args.seed);
    console.log(`Set seed ${args.seed} on node ${node}.`);
  }
}

const queued = await postJson(`${HOST}/prompt`, {
  prompt: workflow,
  client_id: clientId,
});
const promptId = queued.prompt_id;
if (!promptId) {
  console.error("ComfyUI returned no prompt_id:", JSON.stringify(queued.node_errors ?? queued));
  process.exit(1);
}
console.log(`Queued prompt ${promptId}. Waiting for ComfyUI to finish...`);

const history = await pollHistory(promptId);
const images = collectImages(history);
if (images.length === 0) {
  console.error("Workflow finished but produced no images.");
  process.exit(1);
}

await mkdir(args.out, { recursive: true });
const saved = [];
for (const img of images) {
  const url =
    `${HOST}/view?filename=${encodeURIComponent(img.filename)}` +
    `&subfolder=${encodeURIComponent(img.subfolder || "")}` +
    `&type=${encodeURIComponent(img.type || "output")}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`Failed to download ${img.filename}: ${res.status}`);
    continue;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const dest = join(args.out, img.filename);
  await writeFile(dest, buf);
  saved.push(dest);
  console.log(`Saved ${dest}`);
}

console.log(`\nDone — ${saved.length} image(s) in ${args.out}`);
console.log("Reference them in Remotion like:");
for (const s of saved.slice(0, 3)) {
  const rel = s.replace(/^public[\\/]/, "").replace(/\\/g, "/");
  console.log(`  <Img src={staticFile(${JSON.stringify(rel)})} />`);
}

// --- helpers ---------------------------------------------------------------

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith("--")) {
      out[key] = next;
      i++;
    } else {
      out[key] = true;
    }
  }
  return out;
}

function findNode(wf, classType) {
  for (const [id, node] of Object.entries(wf)) {
    if (node && node.class_type === classType) return id;
  }
  return null;
}

async function postJson(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`POST ${url} -> ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

async function pollHistory(promptId, { timeoutMs = 600_000, intervalMs = 1500 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await fetch(`${HOST}/history/${promptId}`);
    if (res.ok) {
      const data = await res.json();
      if (data[promptId]) return data[promptId];
    }
    await sleep(intervalMs);
  }
  throw new Error(`Timed out waiting for prompt ${promptId}`);
}

function collectImages(history) {
  const out = [];
  for (const node of Object.values(history.outputs || {})) {
    if (node && Array.isArray(node.images)) out.push(...node.images);
  }
  return out;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
