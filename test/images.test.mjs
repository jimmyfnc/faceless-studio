import { describe, it, expect } from "vitest";
import { parseManifest, resolveEntry, workflowToFile, flaggedNames } from "../tools/lib/images.mjs";

describe("parseManifest", () => {
  it("parses the object form with defaults", () => {
    const { defaults, images, errors } = parseManifest({
      defaults: { workflow: "flux-schnell", negative: "text" },
      images: [{ name: "s01a", label: "Hook", prompt: "a robot" }],
    });
    expect(errors).toEqual([]);
    expect(defaults.workflow).toBe("flux-schnell");
    expect(images[0]).toMatchObject({ name: "s01a", label: "Hook", prompt: "a robot" });
  });

  it("accepts a bare array (legacy prompts file) with name as the label fallback", () => {
    const { images, errors } = parseManifest([{ name: "s01a", prompt: "a robot" }]);
    expect(errors).toEqual([]);
    expect(images[0].label).toBe("s01a");
  });

  it("rejects bad names, duplicates, and missing prompts without throwing", () => {
    const { images, errors } = parseManifest([
      { name: "s01a", prompt: "ok" },
      { name: "s01a", prompt: "dupe" },
      { name: "bad name!", prompt: "x" },
      { name: "s02a" },
    ]);
    expect(images).toHaveLength(1);
    expect(errors).toHaveLength(3);
    expect(errors.join(" ")).toMatch(/duplicate/);
    expect(errors.join(" ")).toMatch(/missing prompt/);
  });

  it("flags an empty manifest", () => {
    expect(parseManifest({}).errors[0]).toMatch(/no images/);
  });
});

describe("resolveEntry", () => {
  const defaults = { workflow: "flux-schnell", negative: "text, watermark" };

  it("entry workflow overrides the default; bare names become workflow paths", () => {
    const r = resolveEntry({ name: "s05b", prompt: "p", workflow: "qwen-image" }, defaults);
    expect(r.workflowFile).toBe("workflows/qwen-image.json");
  });

  it("falls back default → CLI fallback, and inherits the default negative", () => {
    const r = resolveEntry({ name: "s01a", prompt: "p" }, {}, { workflowFallback: "workflows/sdxl.json" });
    expect(r.workflowFile).toBe("workflows/sdxl.json");
    const r2 = resolveEntry({ name: "s01a", prompt: "p" }, defaults);
    expect(r2.negative).toBe("text, watermark");
  });

  it("uses the style fallback when neither entry nor defaults set one", () => {
    const r = resolveEntry({ name: "s01a", prompt: "p" }, {}, { styleFallback: "clay style" });
    expect(r.style).toBe("clay style");
  });
});

describe("workflowToFile", () => {
  it("passes through paths and .json names, maps bare names", () => {
    expect(workflowToFile("workflows/custom.json")).toBe("workflows/custom.json");
    expect(workflowToFile("qwen-image")).toBe("workflows/qwen-image.json");
    expect(workflowToFile("")).toBe("");
  });
});

describe("flaggedNames", () => {
  it("strips candidate suffixes + extensions and dedupes", () => {
    const names = flaggedNames({
      summary: {
        flagged: [{ file: "s03a-2.png" }, { file: "s03a.png" }, { file: "s10b.jpg" }],
      },
    });
    expect(names).toEqual(["s03a", "s10b"]);
  });

  it("handles a missing/empty report", () => {
    expect(flaggedNames(undefined)).toEqual([]);
    expect(flaggedNames({ summary: { flagged: [] } })).toEqual([]);
  });
});
