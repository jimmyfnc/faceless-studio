import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { brandSchema, defaultBrand } from "../src/theme/tokens";
import { explainerSchema } from "../src/compositions/ExplainerVideo";
import { mergeBrandIntoProps } from "../tools/_channel.mjs";

const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
const exampleBrand = readJson("channels/example-explainers/brand.json");
const exampleProps = readJson(
  "channels/example-explainers/videos/compound-interest/props.json",
);

describe("brandSchema", () => {
  it("accepts defaultBrand", () => {
    expect(() => brandSchema.parse(defaultBrand)).not.toThrow();
  });

  it("accepts the bundled example channel brand.json", () => {
    expect(() => brandSchema.parse(exampleBrand)).not.toThrow();
  });

  it("rejects a brand missing its colors", () => {
    expect(() =>
      brandSchema.parse({ fonts: { heading: "x", body: "y" } }),
    ).toThrow();
  });
});

describe("explainerSchema", () => {
  it("accepts the bundled example props.json", () => {
    expect(() => explainerSchema.parse(exampleProps)).not.toThrow();
  });

  it("accepts props merged with a brand (the render-time shape)", () => {
    const merged = mergeBrandIntoProps(exampleProps, exampleBrand);
    expect(() => explainerSchema.parse(merged)).not.toThrow();
  });

  it("treats brand as optional so the engine can fall back to defaultBrand", () => {
    expect(explainerSchema.parse(exampleProps).brand).toBeUndefined();
  });

  it("rejects props with no sections array", () => {
    expect(() => explainerSchema.parse({ captions: [] })).toThrow();
  });

  it("rejects an unknown section kind", () => {
    expect(() =>
      explainerSchema.parse({
        sections: [{ kind: "video", durationInFrames: 10 }],
        captions: [],
      }),
    ).toThrow();
  });
});
