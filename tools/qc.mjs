#!/usr/bin/env node
/**
 * QC a video's generated images for hallucination defects (baked text, bad
 * anatomy, garbled shapes, off-brand) before they ship.
 *
 *   npm run qc -- <channel> <slug>
 *   npm run qc -- ai-learning the-new-ai-engineering-stack-01-prompt-engineering
 *
 * Reviews every image in public/assets/<channel>/<slug>/ and writes
 * channels/<channel>/videos/<slug>/qc-report.json. Exits non-zero if anything
 * is flagged, so it can gate a build.
 *
 * Vision provider (see tools/lib/qc.mjs): "api" (bring your own OpenAI-compatible
 * vision endpoint) reviews automatically. With no endpoint ("agent" mode) it
 * writes qc-request.json — the files + checklist — for Claude Code to review
 * in-session and fill qc-report.json.
 */
import { readFile, writeFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, extname } from "node:path";
import { loadQcConfig, createVision, buildQcPrompt, summarizeReport, parseQcVerdict } from "./lib/qc.mjs";

const [channel, slug] = process.argv.slice(2);
if (!channel || !slug) {
  console.error("Usage: npm run qc -- <channel> <slug>");
  process.exit(1);
}

const assetDir = join("public", "assets", channel, slug);
if (!existsSync(assetDir)) {
  console.error(`No asset dir at ${assetDir}`);
  process.exit(1);
}
const files = (await readdir(assetDir)).filter((f) => /\.(png|jpe?g|webp)$/i.test(f)).sort();
if (!files.length) {
  console.error(`No images in ${assetDir}`);
  process.exit(1);
}

let styleNote = "";
try {
  styleNote = JSON.parse(await readFile(join("channels", channel, "style.json"), "utf8")).imageStyle || "";
} catch {
  // no channel style preset — offBrand check is skipped against ""
}
const prompt = buildQcPrompt(styleNote);
const mimeOf = (f) => (/\.png$/i.test(f) ? "image/png" : /\.webp$/i.test(f) ? "image/webp" : "image/jpeg");

const videoDir = join("channels", channel, "videos", slug);
const reportPath = join(videoDir, "qc-report.json");
const vision = createVision(loadQcConfig());

// ── Agent mode: emit the batch for Claude Code to review in-session ──────────
if (!vision.configured) {
  const requestPath = join(videoDir, "qc-request.json");
  await writeFile(
    requestPath,
    JSON.stringify(
      { assetDir, styleNote, prompt, images: files.map((f) => `${assetDir}/${f}`), reportPath },
      null,
      2,
    ) + "\n",
  );
  console.log(`Agent mode (no vision API). Wrote ${files.length}-image batch → ${requestPath}`);
  console.log("Inside Claude Code: review each image against the checklist and write qc-report.json.");
  console.log("Or bring your own: set QC_VISION_BASE_URL + QC_VISION_MODEL (+ QC_VISION_API_KEY).");
  process.exit(0);
}

// ── API mode: review automatically ───────────────────────────────────────────
console.log(`QC ${files.length} image(s) via ${vision.model} → ${reportPath}`);
const results = [];
for (const file of files) {
  const imageBase64 = (await readFile(join(assetDir, file))).toString("base64");
  try {
    const reply = await vision.inspect({ imageBase64, mimetype: mimeOf(file), prompt });
    const verdict = parseQcVerdict(reply);
    results.push({ file, src: `assets/${channel}/${slug}/${file}`, ...verdict });
    console.log(`  ${verdict.verdict === "pass" ? "✓" : "⚠"} ${file}${verdict.reasons.length ? ` — ${verdict.reasons.join("; ")}` : ""}`);
  } catch (e) {
    results.push({ file, src: `assets/${channel}/${slug}/${file}`, verdict: "flag", reasons: [`error: ${e.message}`], hasText: false, anatomy: false, garbled: false, offBrand: false, notes: "" });
    console.warn(`  ! ${file} failed: ${e.message}`);
  }
}

const summary = summarizeReport(results);
await writeFile(reportPath, JSON.stringify({ summary, results }, null, 2) + "\n");
console.log(`\n${summary.passed}/${summary.total} passed.`);
if (summary.flagged.length) {
  console.log("Flagged (regenerate these):");
  for (const f of summary.flagged) console.log(`  ⚠ ${f.file} — ${f.reasons.join("; ")}`);
  process.exit(1);
}
