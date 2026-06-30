import { describe, it, expect } from "vitest";
import { mergeCaptionTokens } from "../tools/lib/transcribe.mjs";

describe("mergeCaptionTokens", () => {
  it("keeps space-led tokens as separate words (trimming the space)", () => {
    expect(
      mergeCaptionTokens([
        { text: "What", startMs: 0, endMs: 200 },
        { text: " if", startMs: 200, endMs: 350 },
      ]),
    ).toEqual([
      { text: "What", startMs: 0, endMs: 200 },
      { text: "if", startMs: 200, endMs: 350 },
    ]);
  });

  it("merges sub-word tokens into one word and extends the end time", () => {
    expect(
      mergeCaptionTokens([
        { text: " invest", startMs: 200, endMs: 400 },
        { text: " $", startMs: 400, endMs: 450 },
        { text: "1", startMs: 450, endMs: 500 },
        { text: ",", startMs: 500, endMs: 520 },
        { text: "000", startMs: 520, endMs: 700 },
      ]),
    ).toEqual([
      { text: "invest", startMs: 200, endMs: 400 },
      { text: "$1,000", startMs: 400, endMs: 700 },
    ]);
  });

  it("attaches trailing punctuation to the preceding word", () => {
    expect(
      mergeCaptionTokens([
        { text: " market", startMs: 0, endMs: 300 },
        { text: ".", startMs: 300, endMs: 320 },
      ]),
    ).toEqual([{ text: "market.", startMs: 0, endMs: 320 }]);
  });

  it("drops whitespace-only tokens but extends the previous end time", () => {
    expect(
      mergeCaptionTokens([
        { text: "Hi", startMs: 0, endMs: 100 },
        { text: "   ", startMs: 100, endMs: 140 },
      ]),
    ).toEqual([{ text: "Hi", startMs: 0, endMs: 140 }]);
  });

  it("returns an empty array for no tokens", () => {
    expect(mergeCaptionTokens([])).toEqual([]);
  });
});
