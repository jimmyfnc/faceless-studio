import { describe, it, expect } from "vitest";
import { mergeBrandIntoProps } from "../tools/_channel.mjs";

const props = { sections: [], captions: [] };
const brand = {
  colors: { accent: "#fff" },
  fonts: { heading: "x", body: "y" },
};

describe("mergeBrandIntoProps", () => {
  it("adds the brand when one is provided", () => {
    expect(mergeBrandIntoProps(props, brand)).toEqual({ ...props, brand });
  });

  it("returns props untouched (no brand key) when no brand is provided", () => {
    const out = mergeBrandIntoProps(props, undefined);
    expect(out).toBe(props);
    expect(out).not.toHaveProperty("brand");
  });

  it("lets a supplied brand override an existing one", () => {
    const withOld = { ...props, brand: { old: true } };
    expect(mergeBrandIntoProps(withOld, brand).brand).toEqual(brand);
  });

  it("does not mutate the input props", () => {
    const p = { sections: [], captions: [] };
    mergeBrandIntoProps(p, brand);
    expect(p).not.toHaveProperty("brand");
  });
});
