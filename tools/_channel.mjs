/**
 * Shared helper for the channel-aware render/studio wrappers.
 *
 * A video's props live in `channels/<id>/videos/<slug>/props.json` and its
 * brand in `channels/<id>/brand.json`. Remotion's `--props` takes a single JSON
 * object (and on Windows shells, inline JSON is unsupported), so we merge
 * brand + props into one temp file and point `--props` at it.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

/** Read brand + props for <channel>/<slug>, merge, write a temp file, return its path. */
export async function writeMergedProps(channel, slug) {
  if (!channel || !slug) {
    console.error(
      "Usage: <channel> <slug>\n" +
        "  e.g. example-explainers compound-interest",
    );
    process.exit(1);
  }

  const channelDir = join("channels", channel);
  const propsPath = join(channelDir, "videos", slug, "props.json");
  const brandPath = join(channelDir, "brand.json");

  let props;
  try {
    props = JSON.parse(await readFile(propsPath, "utf8"));
  } catch {
    console.error(
      `Could not read ${propsPath}\n` +
        `  Does channel "${channel}" have a video "${slug}"?`,
    );
    process.exit(1);
  }

  let brand;
  try {
    brand = JSON.parse(await readFile(brandPath, "utf8"));
  } catch {
    // No brand.json → the engine falls back to defaultBrand.
  }

  const merged = brand ? { ...props, brand } : props;
  const dir = join(tmpdir(), "faceless-studio");
  await mkdir(dir, { recursive: true });
  const out = join(dir, `${channel}__${slug}.props.json`);
  await writeFile(out, JSON.stringify(merged));
  return out;
}
