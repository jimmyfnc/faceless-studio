/**
 * Image manifest — a video's generated images as first-class content.
 *
 * `channels/<channel>/videos/<slug>/images.json` declares every generated image
 * next to the script it illustrates, so prompts are versioned with the video
 * instead of living in whoever-ran-it's head:
 *
 *   {
 *     "defaults": { "workflow": "flux-schnell", "negative": "text, watermark" },
 *     "images": [
 *       { "name": "s01a", "label": "Hook", "prompt": "a friendly clay robot ..." },
 *       { "name": "s05b", "prompt": "...", "workflow": "qwen-image" }
 *     ]
 *   }
 *
 * Per-entry `workflow` routes a single image to a different model (e.g. Qwen
 * for character/hand shots, schnell for everything else). A bare JSON array is
 * accepted as shorthand for `{ images: [...] }`, so older prompt files parse.
 *
 * Library-first and pure (no fs): the CLI (`tools/generate.mjs`) and the future
 * web app call these. All exports are unit-tested.
 */

const NAME_RE = /^[a-z0-9][a-z0-9-]*$/i;

/**
 * Parse + validate a manifest (object or bare array). Never throws.
 * @returns {{ defaults: object, images: object[], errors: string[] }}
 */
export function parseManifest(input) {
  const errors = [];
  const defaults = (!Array.isArray(input) && input && typeof input === "object" && input.defaults) || {};
  const raw = Array.isArray(input) ? input : (input && input.images) || [];
  if (!Array.isArray(raw) || !raw.length) {
    return { defaults, images: [], errors: ["no images: expected an array or { images: [...] }"] };
  }

  const seen = new Set();
  const images = [];
  raw.forEach((e, i) => {
    const at = `images[${i}]`;
    if (!e || typeof e !== "object") {
      errors.push(`${at}: not an object`);
      return;
    }
    const name = typeof e.name === "string" ? e.name.trim() : "";
    if (!name || !NAME_RE.test(name)) {
      errors.push(`${at}: bad or missing name (letters/digits/dashes, e.g. "s01a")`);
      return;
    }
    if (seen.has(name)) {
      errors.push(`${at}: duplicate name "${name}"`);
      return;
    }
    seen.add(name);
    if (typeof e.prompt !== "string" || !e.prompt.trim()) {
      errors.push(`${at} ("${name}"): missing prompt`);
      return;
    }
    images.push({
      name,
      label: typeof e.label === "string" && e.label.trim() ? e.label.trim() : name,
      prompt: e.prompt.trim(),
      workflow: typeof e.workflow === "string" && e.workflow.trim() ? e.workflow.trim() : undefined,
      negative: typeof e.negative === "string" && e.negative.trim() ? e.negative.trim() : undefined,
      style: typeof e.style === "string" && e.style.trim() ? e.style.trim() : undefined,
    });
  });
  return { defaults, images, errors };
}

/**
 * Resolve one entry against the manifest defaults + a channel-level style
 * fallback. Workflow may be a bare name ("qwen-image") or a path.
 * @returns {{ name, label, prompt, style, negative, workflowFile }}
 */
export function resolveEntry(entry, defaults = {}, { styleFallback = "", workflowFallback = "" } = {}) {
  const wf = entry.workflow || defaults.workflow || workflowFallback;
  return {
    name: entry.name,
    label: entry.label || entry.name,
    prompt: entry.prompt,
    style: entry.style || defaults.style || styleFallback || "",
    negative: entry.negative ?? defaults.negative ?? "",
    workflowFile: workflowToFile(wf),
  };
}

/** "qwen-image" → "workflows/qwen-image.json"; paths and .json names pass through. */
export function workflowToFile(wf) {
  if (!wf) return "";
  if (/[\\/]/.test(wf) || /\.json$/i.test(wf)) return wf;
  return `workflows/${wf}.json`;
}

/**
 * Reduce a QC report's flagged files to manifest names: strips candidate
 * suffixes and extensions ("s03a-2.png" and "s03a.png" both → "s03a").
 */
export function flaggedNames(report) {
  const files = (report?.summary?.flagged || []).map((f) => f.file).filter(Boolean);
  const names = files.map((f) => f.replace(/\.(png|jpe?g|webp)$/i, "").replace(/-\d+$/, ""));
  return [...new Set(names)];
}
