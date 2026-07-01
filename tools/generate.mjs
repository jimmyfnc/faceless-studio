#!/usr/bin/env node
/**
 * Batch-generate brand-styled images with ComfyUI (SDXL), one per prompt.
 *
 *   npm run generate -- <channel> <slug> <prompts.json> [--style "..."]
 *
 * prompts.json: [ { "name": "hook", "label": "...", "prompt": "..." }, ... ]
 * Each image is saved to public/assets/<channel>/<slug>/<name>.png with a
 * predictable name, and registered in credits.json as your own (license: own).
 * Requires the ComfyUI server running (see workflows/sdxl.json). Falls back host
 * via COMFYUI_HOST.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { buildCredits } from "./lib/licensing.mjs";

const HOST = (process.env.COMFYUI_HOST || "http://127.0.0.1:8188").replace(/\/$/, "");
// Per-image poll timeout. Heavy models (e.g. Qwen-Image, ~19GB) can take minutes
// to load on the FIRST image, so default generously; override via env if needed.
const GEN_TIMEOUT_MS = Number(process.env.COMFYUI_TIMEOUT_MS) || 600_000;
const DEFAULT_STYLE =
  "clean isometric tech illustration, dark background, neon green and teal accents, " +
  "cinematic lighting, highly detailed, no text, no words, no watermark";

const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : null;
};
const styleFlag = flag("--style");
const workflowFile = flag("--workflow") || "workflows/sdxl.json";
const positionals = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith("--")) i++;
  else positionals.push(argv[i]);
}
const [channel, slug, promptsFile] = positionals;
if (!channel || !slug || !promptsFile) {
  console.error('Usage: npm run generate -- <channel> <slug> <prompts.json> [--workflow workflows/x.json] [--style "..."] [--candidates N]');
  process.exit(1);
}

const candidates = Math.max(1, Number(flag("--candidates")) || 1);
let channelStyle = null;
try {
  channelStyle = JSON.parse(await readFile(join("channels", channel, "style.json"), "utf8")).imageStyle || null;
} catch {
  // no channel style preset
}
const style = styleFlag || channelStyle || DEFAULT_STYLE;
const sourceLabel = `ComfyUI (${(workflowFile.split(/[\\/]/).pop() || "sdxl").replace(/\.json$/, "")})`;
const workflow = JSON.parse(await readFile(workflowFile, "utf8"));
const prompts = JSON.parse(await readFile(promptsFile, "utf8"));
const assetDir = join("public", "assets", channel, slug);
await mkdir(assetDir, { recursive: true });

console.log(`Generating ${prompts.length} prompt(s) × ${candidates} via ${sourceLabel} → ${assetDir}`);
const saved = [];
for (let i = 0; i < prompts.length; i++) {
  const p = prompts[i];
  const base = p.name || `gen-${String(i + 1).padStart(2, "0")}`;
  for (let c = 1; c <= candidates; c++) {
    const name = candidates > 1 ? `${base}-${c}` : base;
    const wf = structuredClone(workflow);
    wf["6"].inputs.text = `${p.prompt}, ${style}`;
    wf["3"].inputs.seed = Math.floor(Math.random() * 1e9);
    try {
      const img = await runComfy(wf);
      const buf = await downloadImage(img);
      const file = `${name}.png`;
      await writeFile(join(assetDir, file), buf);
      saved.push({
        file,
        src: `assets/${channel}/${slug}/${file}`,
        title: p.label || name,
        author: "you",
        source: sourceLabel,
        license: "own",
        provider: "comfyui",
        pageUrl: "",
        url: "",
      });
      console.log(`  ✓ ${file}`);
    } catch (e) {
      console.warn(`  ! ${name} failed: ${e.message}`);
    }
  }
}

// Merge into credits.json (own + any fetched).
const creditsPath = join("channels", channel, "videos", slug, "credits.json");
let existing = [];
if (existsSync(creditsPath)) {
  try {
    existing = JSON.parse(await readFile(creditsPath, "utf8")).assets || [];
  } catch {
    // rebuild
  }
}
const byFile = new Map();
for (const a of [...existing, ...saved]) byFile.set(a.file, a);
const credits = buildCredits([...byFile.values()]);
await mkdir(join("channels", channel, "videos", slug), { recursive: true });
await writeFile(creditsPath, JSON.stringify(credits, null, 2) + "\n");
console.log(`\nGenerated ${saved.length} image(s); credits → ${creditsPath}`);

/* ── ComfyUI HTTP ─────────────────────────────────────────────────────────── */
async function runComfy(wf) {
  const queued = await postJson(`${HOST}/prompt`, { prompt: wf, client_id: `faceless-gen-${process.pid}` });
  const id = queued.prompt_id;
  if (!id) throw new Error(`no prompt_id: ${JSON.stringify(queued.node_errors ?? queued)}`);
  const start = Date.now();
  while (Date.now() - start < GEN_TIMEOUT_MS) {
    const res = await fetch(`${HOST}/history/${id}`);
    if (res.ok) {
      const data = await res.json();
      if (data[id]) {
        for (const node of Object.values(data[id].outputs || {})) {
          if (node && Array.isArray(node.images) && node.images.length) return node.images[0];
        }
        throw new Error("finished but produced no image");
      }
    }
    await new Promise((r) => setTimeout(r, 1200));
  }
  throw new Error("timed out");
}

async function downloadImage(img) {
  const url =
    `${HOST}/view?filename=${encodeURIComponent(img.filename)}` +
    `&subfolder=${encodeURIComponent(img.subfolder || "")}&type=${encodeURIComponent(img.type || "output")}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function postJson(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${url} -> ${res.status}: ${await res.text()}`);
  return res.json();
}
