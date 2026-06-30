#!/usr/bin/env node
/**
 * Source copyright-safe media for a video.
 *
 *   # Search Openverse (CC/public-domain), license-filter, download, credit:
 *   npm run assets -- <channel> <slug> "<query>" [count]
 *   npm run assets -- example-explainers compound-interest "stock market" 4
 *
 *   # Credit your own / AI-generated (e.g. ComfyUI) file already in the folder:
 *   npm run assets -- <channel> <slug> --own diagram.png --source "ComfyUI" --title "Compounding"
 *
 * Downloads land in public/assets/<channel>/<slug>/; provenance + attribution go
 * to channels/<channel>/videos/<slug>/credits.json. Only license-safe results are
 * kept (NC/ND/unknown are dropped). Reference an asset in the script with
 * [VISUAL: image — "assets/<ch>/<slug>/file.jpg" | "<attribution>"].
 */
import { writeFile, readFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { searchOpenverse } from "./lib/providers/openverse.mjs";
import { filterByLicense, buildCredits, assessLicense } from "./lib/licensing.mjs";

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      const key = argv[i].slice(2);
      flags[key] = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true;
    } else positional.push(argv[i]);
  }
  return { positional, flags };
}

const { positional, flags } = parseArgs(process.argv.slice(2));
const [channel, slug] = positional;
if (!channel || !slug) {
  console.error('Usage: npm run assets -- <channel> <slug> "<query>" [count]   (or --own <file>)');
  process.exit(1);
}

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const creditsPath = join("channels", channel, "videos", slug, "credits.json");

async function upsertCredits(newAssets) {
  let existing = [];
  if (existsSync(creditsPath)) {
    try {
      existing = JSON.parse(await readFile(creditsPath, "utf8")).assets || [];
    } catch {
      // ignore a malformed file; we rebuild
    }
  }
  const byFile = new Map();
  for (const a of [...existing, ...newAssets]) byFile.set(a.file, a);
  const credits = buildCredits([...byFile.values()]);
  await mkdir(join("channels", channel, "videos", slug), { recursive: true });
  await writeFile(creditsPath, JSON.stringify(credits, null, 2) + "\n");
  return credits;
}

function extFromType(t) {
  if (!t) return ".jpg";
  if (t.includes("png")) return ".png";
  if (t.includes("webp")) return ".webp";
  if (t.includes("gif")) return ".gif";
  return ".jpg";
}

if (flags.own) {
  const bare = String(flags.own).split(/[\\/]/).pop();
  const asset = {
    file: bare,
    src: `assets/${channel}/${slug}/${bare}`,
    title: flags.title ? String(flags.title) : bare,
    author: "you",
    source: flags.source ? String(flags.source) : "your own / AI-generated",
    license: "own",
    provider: flags.source ? String(flags.source) : "local",
    pageUrl: "",
    url: "",
  };
  const credits = await upsertCredits([asset]);
  console.log(`Registered own asset "${bare}" → ${creditsPath} (${credits.assets.length} total).`);
  process.exit(0);
}

const query = positional[2];
const count = Math.max(1, Math.min(Number(positional[3]) || 4, 12));
if (!query) {
  console.error('Provide a search query, e.g. npm run assets -- ' + channel + " " + slug + ' "stock market"');
  process.exit(1);
}

console.log(`Searching Openverse for "${query}" (commercial + modifiable only)…`);
const candidates = await searchOpenverse(query, { count: count * 3 });
const safe = filterByLicense(candidates);
console.log(`  ${candidates.length} found, ${safe.length} license-safe; taking up to ${count}.`);

const assetDir = join("public", "assets", channel, slug);
await mkdir(assetDir, { recursive: true });
const saved = [];
for (const c of safe.slice(0, count)) {
  try {
    const res = await fetch(c.url, { headers: { "User-Agent": "faceless-studio" } });
    if (!res.ok) {
      console.warn(`  ! skip (${res.status}) ${c.url}`);
      continue;
    }
    const file = `${slugify(query)}-${saved.length + 1}${extFromType(res.headers.get("content-type"))}`;
    await writeFile(join(assetDir, file), Buffer.from(await res.arrayBuffer()));
    saved.push({ ...c, file, src: `assets/${channel}/${slug}/${file}` });
    console.log(`  ↓ ${file}  [${c.license || "?"}]`);
  } catch (e) {
    console.warn(`  ! skip (${e.message}) ${c.url}`);
  }
}

const credits = await upsertCredits(saved);
console.log(`\nWrote ${creditsPath} (${credits.assets.length} assets).`);
if (credits.attributionBlock) console.log(`\n${credits.attributionBlock}\n`);
if (saved[0]) {
  const a = assessLicense(saved[0].license);
  const cap = a.requiresAttribution
    ? `${saved[0].author || saved[0].source} (${(saved[0].license || "").toUpperCase()})`
    : `${saved[0].source || "public domain"}`;
  console.log(`Use it:  [VISUAL: image — "${saved[0].src}" | "${cap}"]`);
}
