#!/usr/bin/env node
/**
 * Open Remotion Studio on one channel video for polishing.
 *
 *   npm run studio -- <channel> <slug>
 *   npm run studio -- example-explainers compound-interest
 *
 * (Plain `npm run dev` opens Studio on the engine's sample instead.)
 */
import { spawnSync } from "node:child_process";
import { writeMergedProps, npx } from "./_channel.mjs";

const [channel, slug] = process.argv.slice(2);
const propsFile = await writeMergedProps(channel, slug);

const res = spawnSync(
  npx(),
  ["remotion", "studio", `--props=${propsFile}`],
  { stdio: "inherit" },
);
process.exit(res.status ?? 1);
