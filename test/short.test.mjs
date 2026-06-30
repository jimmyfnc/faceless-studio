import { describe, it, expect } from "vitest";
import { trimSectionsToSeconds, totalFrames } from "../tools/lib/short.mjs";

const S = (kind, durationInFrames) => ({ kind, durationInFrames });

describe("trimSectionsToSeconds (fps 30)", () => {
  it("truncates the boundary section to hit the exact target", () => {
    const out = trimSectionsToSeconds([S("title", 90), S("bars", 150), S("text", 120)], 6, 30); // 180 frames
    expect(totalFrames(out)).toBe(180);
    expect(out.map((s) => s.durationInFrames)).toEqual([90, 90]); // title whole + bars truncated to 90
    expect(out[0].kind).toBe("title");
  });

  it("ends cleanly on a section boundary when the target lands there", () => {
    const out = trimSectionsToSeconds([S("title", 90), S("bars", 150), S("text", 120)], 8, 30); // 240 frames
    expect(out.map((s) => s.durationInFrames)).toEqual([90, 150]); // no truncation needed
  });

  it("returns the whole video when it is shorter than the target", () => {
    const sections = [S("title", 90), S("bars", 150), S("text", 120)]; // 360 frames = 12s
    const out = trimSectionsToSeconds(sections, 30, 30);
    expect(out).toEqual(sections);
    expect(totalFrames(out)).toBe(360);
  });

  it("truncates the first section when it alone exceeds the target", () => {
    const out = trimSectionsToSeconds([S("title", 300)], 2, 30); // 60 frames
    expect(out).toEqual([{ kind: "title", durationInFrames: 60 }]);
  });

  it("does not mutate the input sections", () => {
    const sections = [S("title", 90), S("bars", 150)];
    trimSectionsToSeconds(sections, 4, 30);
    expect(sections[1].durationInFrames).toBe(150);
  });
});
