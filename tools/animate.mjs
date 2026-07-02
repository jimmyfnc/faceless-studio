#!/usr/bin/env node
/**
 * Animate a generated still into a short motion clip (image→video) with
 * ComfyUI + Wan 2.2 (5B, ti2v). The clip drops into the same montage slot as
 * the still: `<name>.mp4` replaces `<name>.png` in the video's asset folder
 * (the still is kept in `stills/` for reference or re-animation).
 *
 *   npm run animate -- <channel> <slug> <name> "<motion prompt>"
 *   npm run animate -- ai-learning my-video s01a "the robot waves slowly, gentle camera push in"
 *
 * Describe the *motion* (what moves, how the camera drifts) — the subject is
 * already in the still. ~121 frames @ 24fps ≈ 5s; a montage slot longer than
 * the clip holds its last frame. Requires ComfyUI running with the Wan 2.2 5B
 * files (see workflows/wan22-i2v.json). Each clip takes a few minutes.
 */
import { readFile, writeFile, copyFile, rename, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, basename } from "node:path";
import { buildCredits } from "./lib/licensing.mjs";

const HOST = (process.env.COMFYUI_HOST || "http://127.0.0.1:8188").replace(/\/$/, "");
const COMFY_INPUT = process.env.COMFYUI_INPUT_DIR || "D:/GitHub/ComfyUI/input";
const WORKFLOW = "workflows/wan22-i2v.json";
const TIMEOUT_MS = Number(process.env.COMFYUI_TIMEOUT_MS) || 20 * 60_000;

const [channel, slug, name, prompt] = process.argv.slice(2);
if (!channel || !slug || !name || !prompt) {
  console.error('Usage: npm run animate -- <channel> <slug> <name> "<motion prompt>"');
  process.exit(1);
}

const assetDir = join("public", "assets", channel, slug);
const still = ["png", "jpg", "jpeg", "webp"]
  .map((e) => join(assetDir, `${name}.${e}`))
  .find((p) => existsSync(p));
if (!still) {
  console.error(`No still ${name}.png|jpg in ${assetDir} — generate it first (npm run generate).`);
  process.exit(1);
}

// Stage the still for ComfyUI's LoadImage (reads from its input folder).
const inputName = `animate-${channel}-${basename(still)}`;
await copyFile(still, join(COMFY_INPUT, inputName));

const wf = JSON.parse(await readFile(WORKFLOW, "utf8"));
wf["12"].inputs.image = inputName;
wf["6"].inputs.text = prompt;
wf["3"].inputs.seed = Math.floor(Math.random() * 1e9);

console.log(`Animating ${basename(still)} (~a few minutes)...`);
const queued = await postJson(`${HOST}/prompt`, { prompt: wf, client_id: `faceless-animate-${process.pid}` });
if (!queued.prompt_id) {
  console.error(`queue failed: ${JSON.stringify(queued.node_errors ?? queued).slice(0, 1500)}`);
  process.exit(1);
}
const start = Date.now();
let entry = null;
while (Date.now() - start < TIMEOUT_MS) {
  const res = await fetch(`${HOST}/history/${queued.prompt_id}`);
  if (res.ok) {
    const data = await res.json();
    if (data[queued.prompt_id]) {
      entry = data[queued.prompt_id];
      break;
    }
  }
  await new Promise((r) => setTimeout(r, 3000));
}
if (!entry) {
  console.error("timed out waiting for the clip");
  process.exit(1);
}

let ref = null;
for (const node of Object.values(entry.outputs || {})) {
  for (const arr of Object.values(node)) {
    if (Array.isArray(arr)) {
      const hit = arr.find((x) => x && x.filename && /\.(mp4|webm|mov)$/i.test(x.filename));
      if (hit) ref = hit;
    }
  }
}
if (!ref) {
  console.error(`no video in outputs: ${JSON.stringify(entry.outputs).slice(0, 1000)}`);
  process.exit(1);
}
const url =
  `${HOST}/view?filename=${encodeURIComponent(ref.filename)}` +
  `&subfolder=${encodeURIComponent(ref.subfolder || "")}&type=${encodeURIComponent(ref.type || "output")}`;
const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
const clipFile = `${name}.mp4`;
await writeFile(join(assetDir, clipFile), buf);

// The clip takes the still's montage slot; keep the still in stills/ for redo.
await mkdir(join(assetDir, "stills"), { recursive: true });
await rename(still, join(assetDir, "stills", basename(still)));

// Credits: the beat's entry moves to the clip (generated from our own still).
const creditsPath = join("channels", channel, "videos", slug, "credits.json");
if (existsSync(creditsPath)) {
  try {
    const credits = JSON.parse(await readFile(creditsPath, "utf8"));
    const assets = (credits.assets || []).filter((a) => a.file !== clipFile);
    const stillEntry = assets.find((a) => a.file === basename(still));
    if (stillEntry) {
      stillEntry.file = clipFile;
      stillEntry.src = `assets/${channel}/${slug}/${clipFile}`;
      stillEntry.source = `${stillEntry.source} + ComfyUI (wan22-i2v)`;
    } else {
      assets.push({
        file: clipFile,
        src: `assets/${channel}/${slug}/${clipFile}`,
        title: name,
        author: "you",
        source: "ComfyUI (wan22-i2v)",
        license: "own",
        provider: "comfyui",
        pageUrl: "",
        url: "",
      });
    }
    await writeFile(creditsPath, JSON.stringify(buildCredits(assets), null, 2) + "\n");
  } catch (e) {
    console.warn(`  ! could not update credits: ${e.message}`);
  }
}
console.log(`✓ ${clipFile} (${(buf.length / 1e6).toFixed(1)} MB) in ${Math.round((Date.now() - start) / 1000)}s`);
console.log(`  still kept at ${join(assetDir, "stills", basename(still))}`);
console.log(`  re-draft to pick it up: npm run draft -- ${channel} ${slug}`);

async function postJson(url2, body) {
  const res = await fetch(url2, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${url2} -> ${res.status}: ${await res.text()}`);
  return res.json();
}
