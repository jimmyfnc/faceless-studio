#!/usr/bin/env node
/**
 * Render one channel video to out/<channel>-<slug>.mp4.
 *
 *   npm run render -- <channel> <slug> [outFile]
 *   npm run render -- example-explainers compound-interest
 */
import { join } from "node:path";
import { writeMergedProps } from "./_channel.mjs";
import { runRemotion } from "./_run.mjs";

const [channel, slug, outArg] = process.argv.slice(2);
const propsFile = await writeMergedProps(channel, slug);
const out = outArg || join("out", `${channel}-${slug}.mp4`);

const res = runRemotion(["render", "ExplainerVideo", `--props=${propsFile}`, out]);
process.exit(res.status ?? 1);
