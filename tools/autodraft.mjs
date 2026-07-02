#!/usr/bin/env node
/**
 * Auto-draft a video's props.json from its script + captions.
 *
 *   npm run draft -- <channel> <slug>
 *   npm run draft -- example-explainers compound-interest
 *
 * Reads script.md + captions.json (run `npm run transcribe` first), aligns each
 * section to the caption timings, and writes props.json. Total duration is taken
 * from the voiceover (so it matches the engine's calculateMetadata). Overwrites
 * props.json — polish the draft in Studio afterwards.
 */
import { readFile, writeFile } from "node:fs/promises";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parseMedia } from "@remotion/media-parser";
import { nodeReader } from "@remotion/media-parser/node";
import { parseScript, assembleProps } from "./lib/autodraft.mjs";

const FPS = 30; // matches the engine (ExplainerVideo FPS)

const [channel, slug] = process.argv.slice(2);
if (!channel || !slug) {
  console.error("Usage: npm run draft -- <channel> <slug>");
  process.exit(1);
}

const videoDir = join("channels", channel, "videos", slug);
const scriptPath = join(videoDir, "script.md");
const captionsPath = join(videoDir, "captions.json");
if (!existsSync(scriptPath)) {
  console.error(`No script at ${scriptPath}`);
  process.exit(1);
}
if (!existsSync(captionsPath)) {
  console.error(`No captions at ${captionsPath}. Run: npm run transcribe -- ${channel} ${slug}`);
  process.exit(1);
}

const sections = parseScript(await readFile(scriptPath, "utf8"));
if (!sections.length) {
  console.error("No `## Label (kind)` sections found in the script.");
  process.exit(1);
}
const { words } = JSON.parse(await readFile(captionsPath, "utf8"));

// Total frames from the voiceover (falls back to the last caption end).
const assetDir = join("public", "assets", channel, slug);
const voFile = ["vo.wav", "vo.mp3", "vo.m4a"].find((f) => existsSync(join(assetDir, f)));
const voiceoverSrc = voFile ? `assets/${channel}/${slug}/${voFile}` : undefined;
let totalFrames = Math.max(1, Math.round(((words.at(-1)?.endMs ?? 0) / 1000) * FPS));
if (voFile) {
  try {
    const { slowDurationInSeconds } = await parseMedia({
      src: join(assetDir, voFile),
      reader: nodeReader,
      acknowledgeRemotionLicense: true,
      fields: { slowDurationInSeconds: true },
    });
    if (slowDurationInSeconds > 0) totalFrames = Math.round(slowDurationInSeconds * FPS);
  } catch {
    // keep the caption-based estimate
  }
}

// Per-section media: public/assets/<ch>/<slug>/s01*.png|mp4 → montage for
// section 1, etc. Short generated clips (mp4/webm) mix with stills — the
// montage animates both. Candidate files from `generate --candidates`
// (name-1.png, …) are excluded — only picked/canonical media belongs in a draft.
const MEDIA_RE = /\.(png|jpe?g|webp|mp4|webm)$/i;
const imgFiles = existsSync(assetDir)
  ? readdirSync(assetDir)
      .filter((f) => MEDIA_RE.test(f) && !/-\d+\.(png|jpe?g|webp|mp4|webm)$/i.test(f))
      .sort()
  : [];
const imagesBySection = sections.map((_, i) => {
  const prefix = `s${String(i + 1).padStart(2, "0")}`;
  return imgFiles.filter((f) => f.startsWith(prefix)).map((f) => ({ src: `assets/${channel}/${slug}/${f}` }));
});
const { props, reports, flags } = assembleProps({
  sections,
  captionWords: words,
  voiceoverSrc,
  fps: FPS,
  totalFrames,
  imagesBySection,
});

await writeFile(join(videoDir, "props.json"), JSON.stringify(props, null, 2) + "\n");

const kindCount = (k) => props.sections.filter((s) => s.kind === k).length;
const mix = ["montage", "diagram", "bars", "title", "text", "image", "video"]
  .map((k) => (kindCount(k) ? `${kindCount(k)} ${k}` : null))
  .filter(Boolean)
  .join(", ");
console.log(`Drafted ${sections.length} sections (${mix}) → ${join(videoDir, "props.json")}`);
console.log(`  durations: ${props.sections.map((s) => s.durationInFrames).join(" + ")} = ${totalFrames} frames`);
for (const r of reports) {
  if (r.lowConfidence) {
    console.log(`  ⚠ low alignment (${Math.round(r.confidence * 100)}%): "${r.label}" — check its timing in Studio`);
  }
}
for (const f of flags) console.log(`  ⚠ ${f}`);
console.log(`Polish: npm run studio -- ${channel} ${slug}`);
