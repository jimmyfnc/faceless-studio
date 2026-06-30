#!/usr/bin/env node
/**
 * Transcribe a channel video's voiceover into captions.json.
 *
 *   npm run transcribe -- <channel> <slug> [model]
 *   npm run transcribe -- example-explainers compound-interest
 *
 * Reads public/assets/<channel>/<slug>/vo.(wav|mp3|m4a), writes word-level
 * captions to channels/<channel>/videos/<slug>/captions.json. Default model is
 * medium.en; pass e.g. `base.en` as the 3rd arg for a faster, lighter run.
 */
import { writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { transcribeToWords } from "./lib/transcribe.mjs";

const [channel, slug, model = "medium.en"] = process.argv.slice(2);
if (!channel || !slug) {
  console.error(
    "Usage: npm run transcribe -- <channel> <slug> [model]\n" +
      "  e.g. npm run transcribe -- example-explainers compound-interest base.en",
  );
  process.exit(1);
}

const assetDir = join("public", "assets", channel, slug);
const vo = ["vo.wav", "vo.mp3", "vo.m4a"]
  .map((f) => join(assetDir, f))
  .find((p) => existsSync(p));
if (!vo) {
  console.error(`No voiceover found. Expected one of vo.wav/vo.mp3/vo.m4a in ${assetDir}`);
  process.exit(1);
}

console.log(`Transcribing ${vo}  (model: ${model})`);
const words = await transcribeToWords({
  inputPath: vo,
  model,
  onProgress: (p) => process.stdout.write(`\r  transcribing ${Math.round(p * 100)}%   `),
});

const out = join("channels", channel, "videos", slug, "captions.json");
await writeFile(out, JSON.stringify({ words }, null, 2) + "\n");
console.log(`\n  ${words.length} words → ${out}`);
