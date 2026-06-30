#!/usr/bin/env node
/**
 * Open Remotion Studio on one channel video for polishing.
 *
 *   npm run studio -- <channel> <slug>
 *   npm run studio -- example-explainers compound-interest
 *
 * (Plain `npm run dev` opens Studio on the engine's sample instead.)
 */
import { writeMergedProps } from "./_channel.mjs";
import { runRemotion } from "./_run.mjs";

const [channel, slug] = process.argv.slice(2);
const propsFile = await writeMergedProps(channel, slug);

const res = runRemotion(["studio", `--props=${propsFile}`]);
process.exit(res.status ?? 1);
