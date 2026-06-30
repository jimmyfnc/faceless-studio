import { describe, it, expect } from "vitest";
import {
  slugify,
  episodeSlug,
  buildPlanPrompt,
  parsePlan,
  parseBrief,
  briefToScript,
} from "../tools/lib/research.mjs";
import { parseScript, sceneContent } from "../tools/lib/autodraft.mjs";

describe("slugify / episodeSlug", () => {
  it("slugifies a title", () => {
    expect(slugify("The History of Money!")).toBe("the-history-of-money");
  });
  it("builds ordered, prefixed episode slugs", () => {
    expect(episodeSlug("mars-exploration", 2, "Viking Landers")).toBe("mars-exploration-02-viking-landers");
  });
});

describe("buildPlanPrompt", () => {
  it("includes the topic and asks for strict JSON", () => {
    const p = buildPlanPrompt("space exploration");
    expect(p.json).toBe(true);
    expect(p.prompt).toContain("space exploration");
    expect(p.system).toMatch(/series/i);
  });
});

describe("parsePlan — single vs series", () => {
  it("parses a single-video plan and strips code fences", () => {
    const plan = parsePlan('```json\n{"assessment":"single","rationale":"focused","angles":[{"title":"A","hook":"h"}]}\n```');
    expect(plan.assessment).toBe("single");
    expect(plan.angles[0].title).toBe("A");
    expect(plan.series).toBeNull();
  });

  it("parses a series plan and assigns ordered episode slugs", () => {
    const plan = parsePlan(
      JSON.stringify({
        topic: "Mars exploration",
        assessment: "series",
        rationale: "many distinct arcs",
        angles: [{ title: "X", hook: "y" }],
        series: {
          title: "Mars Exploration",
          rationale: "5 arcs",
          episodes: [
            { order: 1, title: "Early Flybys", hook: "a" },
            { order: 2, title: "Viking Landers", hook: "b" },
          ],
        },
      }),
    );
    expect(plan.assessment).toBe("series");
    expect(plan.series.episodes[1].slug).toBe("mars-exploration-02-viking-landers");
  });

  it("rejects a plan with no assessment", () => {
    expect(() => parsePlan('{"angles":[]}')).toThrow();
  });

  it("rejects a series assessment with no episodes", () => {
    expect(() =>
      parsePlan('{"assessment":"series","angles":[{"title":"a"}],"series":{"episodes":[]}}'),
    ).toThrow();
  });
});

describe("briefToScript → bridges into auto-draft", () => {
  const brief = parseBrief(
    JSON.stringify({
      title: "Test Topic",
      hook: "h",
      sections: [
        { kind: "title", label: "Hook", narration: "Hello there.", visual: 'title — "Test Topic" | "sub"' },
        { kind: "text", label: "Point", narration: "A point.", visual: 'text — "Point"' },
      ],
      facts: [{ text: "fact", sourceUrl: "https://example.com/x", sourceTitle: "Src" }],
    }),
  );

  it("renders ## Label (kind) + narration + [VISUAL] and a sources list", () => {
    const md = briefToScript(brief);
    expect(md).toContain("# Script: Test Topic");
    expect(md).toContain("## Hook (title)");
    expect(md).toContain("Hello there.");
    expect(md).toContain('[VISUAL: title — "Test Topic" | "sub"]');
    expect(md).toContain("### Sources");
    expect(md).toContain("https://example.com/x");
  });

  it("produces a script.md that auto-draft can parse back", () => {
    const secs = parseScript(briefToScript(brief));
    expect(secs.map((s) => s.kind)).toEqual(["title", "text"]);
    expect(sceneContent(secs[0]).fields.text).toBe("Test Topic");
  });
});
