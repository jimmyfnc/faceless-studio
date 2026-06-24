#!/usr/bin/env node
/**
 * Render one channel video to out/<channel>-<slug>.mp4.
 *
 *   npm run render -- <channel> <slug> [outFile]
 *   npm run render -- example-explainers compound-interest
 */
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { writeMergedProps, npx } from "./_channel.mjs";

const [channel, slug, outArg] = process.argv.slice(2);
const propsFile = await writeMergedProps(channel, slug);
const out = outArg || join("out", `${channel}-${slug}.mp4`);

const res = spawnSync(
  npx(),
  ["remotion", "render", "ExplainerVideo", `--props=${propsFile}`, out],
  { stdio: "inherit" },
);
process.exit(res.status ?? 1);
