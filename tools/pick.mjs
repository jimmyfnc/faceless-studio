#!/usr/bin/env node
/**
 * Promote winning candidates after `generate --candidates N`.
 *
 *   npm run pick -- <channel> <slug> s03a=1 s05b=3
 *
 * For each name=N: copies <name>-<N>.png over <name>.png, deletes every
 * <name>-*.png candidate, and rewrites credits.json so the winner's entry
 * (source, workflow) carries over under the canonical filename.
 */
import { readFile, writeFile, copyFile, unlink, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { planPicks, creditsAfterPicks, parsePickArgs } from "./lib/pick.mjs";
import { buildCredits } from "./lib/licensing.mjs";

const [channel, slug, ...pickArgs] = process.argv.slice(2);
if (!channel || !slug || !pickArgs.length) {
  console.error("Usage: npm run pick -- <channel> <slug> <name>=<candidate> ...  (e.g. s03a=1 s05b=3)");
  process.exit(1);
}
const { picks, errors: argErrors } = parsePickArgs(pickArgs);
if (argErrors.length) {
  for (const e of argErrors) console.error(`  ✗ ${e}`);
  process.exit(1);
}

const assetDir = join("public", "assets", channel, slug);
if (!existsSync(assetDir)) {
  console.error(`No asset dir at ${assetDir}`);
  process.exit(1);
}
const files = await readdir(assetDir);
const { actions, errors } = planPicks(files, picks);
if (errors.length) {
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}

for (const a of actions) {
  if (a.op === "promote") {
    await copyFile(join(assetDir, a.from), join(assetDir, a.to));
    console.log(`  ✓ ${a.from} → ${a.to}`);
  }
}
for (const a of actions) {
  if (a.op === "delete") {
    await unlink(join(assetDir, a.file));
    console.log(`  - removed ${a.file}`);
  }
}

// Rewrite credits so winners carry over and candidates disappear.
const creditsPath = join("channels", channel, "videos", slug, "credits.json");
if (existsSync(creditsPath)) {
  try {
    const credits = JSON.parse(await readFile(creditsPath, "utf8"));
    const assets = creditsAfterPicks(credits.assets || [], actions);
    await writeFile(creditsPath, JSON.stringify(buildCredits(assets), null, 2) + "\n");
    console.log(`  ✓ credits updated → ${creditsPath}`);
  } catch (e) {
    console.warn(`  ! could not update credits: ${e.message}`);
  }
}
console.log(`Picked ${Object.keys(picks).length} winner(s).`);
