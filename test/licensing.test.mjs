import { describe, it, expect } from "vitest";
import {
  assessLicense,
  filterByLicense,
  attributionLine,
  buildCredits,
  licenseLabel,
} from "../tools/lib/licensing.mjs";
import { normalizeOpenverseResult } from "../tools/lib/providers/openverse.mjs";

describe("assessLicense — what's safe on a monetized channel", () => {
  it("allows public domain / CC0 with no attribution required", () => {
    for (const l of ["cc0", "pdm", "public-domain", "publicdomain"]) {
      const a = assessLicense(l);
      expect(a.allowed, l).toBe(true);
      expect(a.requiresAttribution, l).toBe(false);
    }
  });

  it("allows CC BY and CC BY-SA but requires attribution", () => {
    for (const l of ["by", "cc-by", "by-sa", "cc-by-sa"]) {
      const a = assessLicense(l);
      expect(a.allowed, l).toBe(true);
      expect(a.requiresAttribution, l).toBe(true);
    }
  });

  it("BLOCKS every non-commercial (NC) and no-derivatives (ND) license", () => {
    for (const l of ["by-nc", "by-nc-sa", "by-nc-nd", "by-nd", "cc-by-nc"]) {
      expect(assessLicense(l).allowed, l).toBe(false);
    }
  });

  it("treats your own / AI-generated as allowed without attribution", () => {
    for (const l of ["own", "generated"]) {
      const a = assessLicense(l);
      expect(a.allowed, l).toBe(true);
      expect(a.requiresAttribution, l).toBe(false);
    }
  });

  it("blocks missing/empty/unknown licenses (conservative default)", () => {
    for (const l of ["", null, undefined, "sampling+", "all-rights-reserved", "mystery"]) {
      expect(assessLicense(l).allowed, String(l)).toBe(false);
    }
  });
});

describe("filterByLicense", () => {
  it("keeps only license-safe candidates", () => {
    const candidates = [
      { id: 1, license: "cc0" },
      { id: 2, license: "by-nc" },
      { id: 3, license: "by" },
      { id: 4, license: "by-nd" },
      { id: 5, license: "" },
    ];
    expect(filterByLicense(candidates).map((c) => c.id)).toEqual([1, 3]);
  });
});

describe("attributionLine", () => {
  it("formats public-domain assets without a 'by Unknown'", () => {
    const line = attributionLine({ title: "Moon", source: "NASA", license: "cc0" });
    expect(line).toContain("NASA");
    expect(line).toContain("CC0");
    expect(line).not.toMatch(/\bby\b/);
  });

  it("formats CC BY assets with author, license, and link", () => {
    const line = attributionLine({
      title: "Sky",
      author: "Jane",
      license: "by",
      pageUrl: "https://example.com/sky",
    });
    expect(line).toContain("Sky");
    expect(line).toContain("by Jane");
    expect(line).toContain("CC BY");
    expect(line).toContain("https://example.com/sky");
  });
});

describe("buildCredits", () => {
  const assets = [
    { file: "a.jpg", title: "PD pic", source: "NASA", license: "cc0" },
    { file: "b.jpg", title: "Attr pic", author: "Sam", license: "by", pageUrl: "https://x/y" },
    { file: "c.jpg", title: "Bad pic", license: "by-nc" },
  ];

  it("enriches each asset with its assessment + attribution", () => {
    const { assets: out } = buildCredits(assets);
    expect(out).toHaveLength(3);
    expect(out[0]).toMatchObject({ allowed: true, requiresAttribution: false, licenseLabel: "CC0" });
    expect(out[1]).toMatchObject({ allowed: true, requiresAttribution: true });
    expect(out[2]).toMatchObject({ allowed: false }); // recorded, not silently dropped
  });

  it("includes only allowed assets in the attribution block", () => {
    const { attributionBlock } = buildCredits(assets);
    expect(attributionBlock).toContain("Attr pic");
    expect(attributionBlock).toContain("PD pic");
    expect(attributionBlock).not.toContain("Bad pic"); // the NC one is excluded
  });
});

describe("licenseLabel", () => {
  it("maps known ids and upper-cases unknowns", () => {
    expect(licenseLabel("cc0")).toBe("CC0");
    expect(licenseLabel("by-sa")).toBe("CC BY-SA");
    expect(licenseLabel("own")).toMatch(/AI-generated/);
    expect(licenseLabel("xyz")).toBe("XYZ");
  });
});

describe("normalizeOpenverseResult", () => {
  it("maps a raw Openverse result to the candidate shape", () => {
    const c = normalizeOpenverseResult({
      title: "Mars",
      creator: "NASA",
      license: "cc0",
      license_version: "1.0",
      license_url: "https://creativecommons.org/publicdomain/zero/1.0/",
      source: "nasa",
      foreign_landing_url: "https://openverse.org/image/123",
      url: "https://files/mars.jpg",
    });
    expect(c).toMatchObject({
      title: "Mars",
      author: "NASA",
      license: "cc0",
      provider: "openverse",
      pageUrl: "https://openverse.org/image/123",
      url: "https://files/mars.jpg",
    });
  });
});
