#!/usr/bin/env node
/**
 * Render a vertical short cut (1080×1920) from a video's leading window.
 *
 *   npm run short -- <channel> <slug> [seconds]
 *   npm run short -- example-explainers compound-interest 25
 *
 * Trims the long-form's props to a leading window (the hook/teaser), keeps the
 * voiceover + captions for that window, and renders the ExplainerShort
 * composition → out/<channel>-<slug>-short.mp4. One source → long-form + shorts.
 * (seconds is positional — npm doesn't forward `--flags` to scripts reliably.)
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mergeBrandIntoProps } from "./_channel.mjs";
import { runRemotion } from "./_run.mjs";
import { trimSectionsToSeconds, totalFrames } from "./lib/short.mjs";

const FPS = 30;
const [channel, slug, secondsArg] = process.argv.slice(2);
if (!channel || !slug) {
  console.error("Usage: npm run short -- <channel> <slug> [seconds]");
  process.exit(1);
}
const seconds = Number(secondsArg) || 30;

const videoDir = join("channels", channel, "videos", slug);
const propsPath = join(videoDir, "props.json");
if (!existsSync(propsPath)) {
  console.error(`No ${propsPath} — run the long-form pipeline first (transcribe + draft).`);
  process.exit(1);
}
const props = JSON.parse(await readFile(propsPath, "utf8"));
let brand;
try {
  brand = JSON.parse(await readFile(join("channels", channel, "brand.json"), "utf8"));
} catch {
  // no brand.json → engine uses defaultBrand
}

const sections = trimSectionsToSeconds(props.sections, seconds, FPS);
const cutFrames = totalFrames(sections);
const cutMs = (cutFrames / FPS) * 1000;
const captions = (props.captions || []).filter((w) => w.startMs < cutMs);
const shortProps = mergeBrandIntoProps({ ...props, sections, captions }, brand);

const dir = join(tmpdir(), "faceless-studio");
await mkdir(dir, { recursive: true });
const tmp = join(dir, `${channel}__${slug}.short.props.json`);
await writeFile(tmp, JSON.stringify(shortProps));

const out = join("out", `${channel}-${slug}-short.mp4`);
console.log(`Short: leading ${(cutFrames / FPS).toFixed(1)}s (${sections.length} scenes) → ${out}`);
const res = runRemotion(["render", "ExplainerShort", `--props=${tmp}`, out]);
process.exit(res.status ?? 1);
