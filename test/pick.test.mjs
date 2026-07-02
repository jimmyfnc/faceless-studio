import { describe, it, expect } from "vitest";
import { planPicks, creditsAfterPicks, parsePickArgs } from "../tools/lib/pick.mjs";

const FILES = ["s03a-1.png", "s03a-2.png", "s03a-3.png", "s05b-1.png", "s05b-2.png", "s01a.png", "vo.mp3"];

describe("planPicks", () => {
  it("promotes the winner and deletes every candidate for that name", () => {
    const { actions, errors } = planPicks(FILES, { s03a: 2 });
    expect(errors).toEqual([]);
    expect(actions).toContainEqual({ op: "promote", from: "s03a-2.png", to: "s03a.png" });
    const deletes = actions.filter((a) => a.op === "delete").map((a) => a.file).sort();
    expect(deletes).toEqual(["s03a-1.png", "s03a-2.png", "s03a-3.png"]);
    // Other names untouched.
    expect(actions.find((a) => a.file === "s05b-1.png")).toBeUndefined();
  });

  it("errors on a missing candidate or bad number, without planning partial actions for it", () => {
    const missing = planPicks(FILES, { s03a: 9 });
    expect(missing.errors[0]).toMatch(/not found/);
    expect(missing.actions).toEqual([]);
    const bad = planPicks(FILES, { s03a: 0 });
    expect(bad.errors[0]).toMatch(/positive integer/);
  });

  it("handles multiple picks at once", () => {
    const { actions, errors } = planPicks(FILES, { s03a: 1, s05b: 2 });
    expect(errors).toEqual([]);
    expect(actions.filter((a) => a.op === "promote")).toHaveLength(2);
  });
});

describe("creditsAfterPicks", () => {
  const assets = [
    { file: "s03a-1.png", src: "assets/ch/sl/s03a-1.png", source: "ComfyUI (qwen-image)", license: "own" },
    { file: "s03a-2.png", src: "assets/ch/sl/s03a-2.png", source: "ComfyUI (qwen-image)", license: "own" },
    { file: "s03a.png", src: "assets/ch/sl/s03a.png", source: "ComfyUI (flux-schnell)", license: "own" },
    { file: "s01a.png", src: "assets/ch/sl/s01a.png", source: "ComfyUI (flux-schnell)", license: "own" },
  ];

  it("carries the winner's entry to the canonical name, replacing the stale one", () => {
    const { actions } = planPicks(["s03a-1.png", "s03a-2.png", "s03a.png", "s01a.png"], { s03a: 1 });
    const out = creditsAfterPicks(assets, actions);
    const canonical = out.filter((a) => a.file === "s03a.png");
    expect(canonical).toHaveLength(1);
    expect(canonical[0].source).toBe("ComfyUI (qwen-image)"); // winner's provenance, not the stale flux one
    expect(canonical[0].src).toBe("assets/ch/sl/s03a.png");
    expect(out.find((a) => a.file === "s03a-1.png")).toBeUndefined();
    expect(out.find((a) => a.file === "s01a.png")).toBeDefined();
  });
});

describe("parsePickArgs", () => {
  it("parses name=N pairs and rejects malformed args", () => {
    const ok = parsePickArgs(["s03a=1", "s05b=3"]);
    expect(ok.errors).toEqual([]);
    expect(ok.picks).toEqual({ s03a: 1, s05b: 3 });
    expect(parsePickArgs(["s03a"]).errors[0]).toMatch(/expected name=N/);
    expect(parsePickArgs([]).errors[0]).toMatch(/no picks/);
  });
});
