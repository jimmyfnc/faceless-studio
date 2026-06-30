import { describe, it, expect } from "vitest";
import { chunkCaptions } from "../src/lib/captions";

const w = (text, startMs, endMs) => ({ text, startMs, endMs });

describe("chunkCaptions", () => {
  it("breaks into blocks of at most maxWords", () => {
    const words = Array.from({ length: 7 }, (_, i) => w(`w${i}`, i * 100, i * 100 + 100));
    const blocks = chunkCaptions(words, 3);
    expect(blocks.map((b) => b.words.length)).toEqual([3, 3, 1]);
  });

  it("breaks early at sentence-ending punctuation", () => {
    const blocks = chunkCaptions(
      [w("Hello", 0, 200), w("there.", 200, 500), w("Next", 500, 700), w("one", 700, 900)],
      6,
    );
    expect(blocks).toHaveLength(2);
    expect(blocks[0].words.map((x) => x.text)).toEqual(["Hello", "there."]);
  });

  it("sets each block's start/end from its first and last word", () => {
    const blocks = chunkCaptions([w("a", 100, 200), w("b", 200, 450)], 6);
    expect(blocks[0].startMs).toBe(100);
    expect(blocks[0].endMs).toBe(450);
  });

  it("returns [] for no words", () => {
    expect(chunkCaptions([])).toEqual([]);
  });
});
