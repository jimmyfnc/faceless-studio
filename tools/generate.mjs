#!/usr/bin/env node
/**
 * Batch-generate a video's images with ComfyUI, driven by its image manifest.
 *
 *   npm run generate -- <channel> <slug>                      # reads videos/<slug>/images.json
 *   npm run generate -- <channel> <slug> --only s03a,s05b     # just these entries
 *   npm run generate -- <channel> <slug> --flagged            # just what qc flagged
 *   npm run generate -- <channel> <slug> prompts.json         # explicit prompts file (ad-hoc)
 *   ... [--candidates N] [--workflow workflows/x.json] [--style "..."]
 *
 * The manifest (see tools/lib/images.mjs) lives with the video's content and
 * routes each entry to a model: per-entry `workflow` (e.g. "qwen-image" for
 * character/hand shots) falls back to the manifest default, then --workflow,
 * then flux-schnell. A per-entry/default `negative` is appended to the
 * workflow's negative prompt (only effective on real-CFG models like Qwen).
 *
 * Images are saved to public/assets/<channel>/<slug>/<name>.png (or <name>-<c>
 * with --candidates; promote a winner with `npm run pick`) and registered in
 * credits.json as your own (license: own). Requires ComfyUI running
 * (COMFYUI_HOST overrides the default http://127.0.0.1:8188).
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { buildCredits } from "./lib/licensing.mjs";
import { parseManifest, resolveEntry, flaggedNames } from "./lib/images.mjs";

const HOST = (process.env.COMFYUI_HOST || "http://127.0.0.1:8188").replace(/\/$/, "");
// Per-image poll timeout. Heavy models (e.g. Qwen-Image, ~19GB) can take minutes
// to load on the FIRST image, so default generously; override via env if needed.
const GEN_TIMEOUT_MS = Number(process.env.COMFYUI_TIMEOUT_MS) || 600_000;
const DEFAULT_WORKFLOW = "workflows/flux-schnell.json";
const DEFAULT_STYLE =
  "clean isometric tech illustration, dark background, neon green and teal accents, " +
  "cinematic lighting, highly detailed, no text, no words, no watermark";

const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : null;
};
const has = (name) => argv.includes(name);
const positionals = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--flagged") continue;
  if (argv[i].startsWith("--")) i++;
  else positionals.push(argv[i]);
}
const [channel, slug, promptsFile] = positionals;
if (!channel || !slug) {
  console.error(
    "Usage: npm run generate -- <channel> <slug> [prompts.json]\n" +
      '       [--only s03a,s05b | --flagged] [--candidates N] [--workflow workflows/x.json] [--style "..."]',
  );
  process.exit(1);
}

const videoDir = join("channels", channel, "videos", slug);
const manifestPath = promptsFile || join(videoDir, "images.json");
if (!existsSync(manifestPath)) {
  console.error(
    `No image manifest at ${manifestPath}.\n` +
      `  Declare the video's images there (see WORKFLOW.md), or pass a prompts.json path.`,
  );
  process.exit(1);
}
const { defaults, images, errors } = parseManifest(JSON.parse(await readFile(manifestPath, "utf8")));
if (errors.length) {
  for (const e of errors) console.error(`  ✗ ${manifestPath}: ${e}`);
  process.exit(1);
}

// ── Entry selection: --only, --flagged, or everything ───────────────────────
let selected = images;
const only = flag("--only");
if (only) {
  const want = only.split(",").map((s) => s.trim()).filter(Boolean);
  const known = new Set(images.map((e) => e.name));
  const missing = want.filter((n) => !known.has(n));
  if (missing.length) {
    console.error(`--only names not in ${manifestPath}: ${missing.join(", ")}`);
    process.exit(1);
  }
  selected = images.filter((e) => want.includes(e.name));
} else if (has("--flagged")) {
  const reportPath = join(videoDir, "qc-report.json");
  if (!existsSync(reportPath)) {
    console.error(`--flagged needs ${reportPath}. Run: npm run qc -- ${channel} ${slug}`);
    process.exit(1);
  }
  const names = flaggedNames(JSON.parse(await readFile(reportPath, "utf8")));
  selected = images.filter((e) => names.includes(e.name));
  if (!selected.length) {
    console.log(`QC report has no flagged images that match ${manifestPath} — nothing to do.`);
    process.exit(0);
  }
}

// ── Style + workflow fallbacks ──────────────────────────────────────────────
let channelStyle = null;
try {
  channelStyle = JSON.parse(await readFile(join("channels", channel, "style.json"), "utf8")).imageStyle || null;
} catch {
  // no channel style preset
}
const styleFallback = flag("--style") || channelStyle || DEFAULT_STYLE;
const workflowFallback = flag("--workflow") || DEFAULT_WORKFLOW;
const candidates = Math.max(1, Number(flag("--candidates")) || 1);

const workflowCache = new Map();
async function loadWorkflow(file) {
  if (!workflowCache.has(file)) {
    workflowCache.set(file, JSON.parse(await readFile(file, "utf8")));
  }
  return workflowCache.get(file);
}
const sourceLabelOf = (file) => `ComfyUI (${(file.split(/[\\/]/).pop() || "").replace(/\.json$/i, "")})`;

const assetDir = join("public", "assets", channel, slug);
await mkdir(assetDir, { recursive: true });

console.log(`Generating ${selected.length} image(s) × ${candidates} → ${assetDir}`);
const saved = [];
for (const entry of selected) {
  const r = resolveEntry(entry, defaults, { styleFallback, workflowFallback });
  const workflow = await loadWorkflow(r.workflowFile);
  for (let c = 1; c <= candidates; c++) {
    const name = candidates > 1 ? `${r.name}-${c}` : r.name;
    const wf = structuredClone(workflow);
    // Node conventions shared by every workflows/*.json: 6 = positive prompt,
    // 7 = negative prompt (where the model supports it), 3 = KSampler.
    wf["6"].inputs.text = r.style ? `${r.prompt}, ${r.style}` : r.prompt;
    if (r.negative && wf["7"]?.inputs) {
      const baked = wf["7"].inputs.text || "";
      wf["7"].inputs.text = baked ? `${baked}, ${r.negative}` : r.negative;
    }
    wf["3"].inputs.seed = Math.floor(Math.random() * 1e9);
    try {
      const img = await runComfy(wf);
      const buf = await downloadImage(img);
      const file = `${name}.png`;
      await writeFile(join(assetDir, file), buf);
      saved.push({
        file,
        src: `assets/${channel}/${slug}/${file}`,
        title: r.label,
        author: "you",
        source: sourceLabelOf(r.workflowFile),
        license: "own",
        provider: "comfyui",
        pageUrl: "",
        url: "",
      });
      console.log(`  ✓ ${file}  (${sourceLabelOf(r.workflowFile)})`);
    } catch (e) {
      console.warn(`  ! ${name} failed: ${e.message}`);
    }
  }
}

// Merge into credits.json (own + any fetched).
const creditsPath = join(videoDir, "credits.json");
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
await mkdir(videoDir, { recursive: true });
await writeFile(creditsPath, JSON.stringify(credits, null, 2) + "\n");
console.log(`\nGenerated ${saved.length} image(s); credits → ${creditsPath}`);
if (candidates > 1 && saved.length) {
  console.log(`Promote winners: npm run pick -- ${channel} ${slug} <name>=<candidate> ...`);
}

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
