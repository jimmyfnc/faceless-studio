import { describe, it, expect } from "vitest";
import {
  parseScript,
  sceneContent,
  alignSectionFrames,
  assembleProps,
} from "../tools/lib/autodraft.mjs";

const script = `# Script

> notes line, ignored

## Hook (title)

Hello world here.
[VISUAL: title — "Big Title" | "Sub"]

## Data (bars)

Numbers go here now.
[VISUAL: bars — "Heading H"; A=10, B=20]

## End (text)

Final words spoken.
[VISUAL: text — "The End" | "bye"]

---

### Pipeline notes

ignore me
`;

describe("parseScript", () => {
  const secs = parseScript(script);

  it("finds the three sections and their kinds", () => {
    expect(secs.map((s) => s.kind)).toEqual(["title", "bars", "text"]);
  });

  it("captures narration but not the [VISUAL] line", () => {
    expect(secs[0].narration).toBe("Hello world here.");
    expect(secs[0].visual).toContain("Big Title");
  });

  it("stops at the --- rule (ignores pipeline notes)", () => {
    expect(secs).toHaveLength(3);
    expect(secs[2].narration).toBe("Final words spoken.");
  });
});

describe("sceneContent", () => {
  it("parses a title's main text + subtitle", () => {
    const { fields } = sceneContent({ kind: "title", label: "Hook", visual: 'title — "Big Title" | "Sub"' });
    expect(fields).toEqual({ text: "Big Title", subtitle: "Sub" });
  });

  it("parses bars heading + data pairs", () => {
    const { fields } = sceneContent({ kind: "bars", label: "Data", visual: 'bars — "Heading H"; A=10, B=20' });
    expect(fields.heading).toBe("Heading H");
    expect(fields.data).toEqual([
      { label: "A", value: 10 },
      { label: "B", value: 20 },
    ]);
  });

  it("flags bars with no parseable data", () => {
    const { flags } = sceneContent({ kind: "bars", label: "X", visual: 'bars — "H";' });
    expect(flags.join(" ")).toMatch(/no data/);
  });

  it("treats a text body as optional", () => {
    const { fields } = sceneContent({ kind: "text", label: "End", visual: 'text — "The End"' });
    expect(fields.heading).toBe("The End");
    expect(fields.body).toBeUndefined();
  });

  it("parses an image src + attribution caption (keeping an em dash in the caption)", () => {
    const { fields } = sceneContent({
      kind: "image",
      label: "Mars",
      visual: 'image — "assets/x/mars.jpg" | "Photo — NASA"',
    });
    expect(fields.src).toBe("assets/x/mars.jpg");
    expect(fields.caption).toBe("Photo — NASA");
  });

  it("parses a diagram's heading, layout, and nodes (with an active marker)", () => {
    const { fields } = sceneContent({
      kind: "diagram",
      label: "Stack",
      visual: 'diagram — "Layer one of four" | stack | "Prompt*; Context; Loop; Harness"',
    });
    expect(fields.heading).toBe("Layer one of four");
    expect(fields.layout).toBe("stack");
    expect(fields.nodes).toEqual([
      { label: "Prompt", active: true },
      { label: "Context", active: false },
      { label: "Loop", active: false },
      { label: "Harness", active: false },
    ]);
  });

  it("defaults an unknown diagram layout to flow", () => {
    const { fields } = sceneContent({ kind: "diagram", label: "X", visual: 'diagram — "H" | sideways | "A; B"' });
    expect(fields.layout).toBe("flow");
  });

  it("parses a video src and flags a missing src", () => {
    const ok = sceneContent({ kind: "video", label: "B", visual: 'video — "assets/x/clip.mp4"' });
    expect(ok.fields.src).toBe("assets/x/clip.mp4");
    expect(ok.fields.caption).toBeUndefined();

    const bad = sceneContent({ kind: "image", label: "X", visual: "image — " });
    expect(bad.flags.join(" ")).toMatch(/no src/);
  });
});

describe("alignSectionFrames", () => {
  const sections = [
    { narration: "hello world here" },
    { narration: "numbers go here now" },
    { narration: "final words spoken" },
  ];
  const c = (text, startMs, endMs) => ({ text, startMs, endMs });
  const captions = [
    c("Hello", 0, 300), c("world", 300, 600), c("here", 600, 900),
    c("numbers", 900, 1300), c("go", 1300, 1500), c("here", 1500, 1700), c("now", 1700, 2000),
    c("final", 2000, 2400), c("words", 2400, 2800), c("spoken", 2800, 3200),
  ];

  it("derives section frames from caption timings and tiles to the total", () => {
    const { frames } = alignSectionFrames(sections, captions, 30, 96); // 3.2s @ 30fps
    expect(frames).toHaveLength(3);
    expect(frames.reduce((a, b) => a + b, 0)).toBe(96);
    expect(frames[0]).toBe(27); // section 1 starts at 900ms → frame 27
  });

  it("flags low confidence when narration does not match the captions", () => {
    const { reports } = alignSectionFrames([{ narration: "zzz qqq xxx" }], captions, 30, 96);
    expect(reports[0].lowConfidence).toBe(true);
  });
});

describe("assembleProps", () => {
  it("produces a schema-shaped props object with aligned durations", () => {
    const sections = parseScript(script);
    const captions = [
      { text: "Hello", startMs: 0, endMs: 300 },
      { text: "world", startMs: 300, endMs: 600 },
      { text: "here", startMs: 600, endMs: 900 },
      { text: "Numbers", startMs: 900, endMs: 1300 },
      { text: "go", startMs: 1300, endMs: 1500 },
      { text: "here", startMs: 1500, endMs: 1700 },
      { text: "now", startMs: 1700, endMs: 2000 },
      { text: "Final", startMs: 2000, endMs: 2400 },
      { text: "words", startMs: 2400, endMs: 2800 },
      { text: "spoken", startMs: 2800, endMs: 3200 },
    ];
    const { props } = assembleProps({ sections, captionWords: captions, voiceoverSrc: "x.mp3", fps: 30, totalFrames: 96 });
    expect(props.voiceoverSrc).toBe("x.mp3");
    expect(props.sections.map((s) => s.kind)).toEqual(["title", "bars", "text"]);
    expect(props.sections.reduce((a, s) => a + s.durationInFrames, 0)).toBe(96);
    expect(props.captions).toHaveLength(10);
  });

  it("turns image-backed sections into montage, but bars keep their chart", () => {
    const sections = parseScript(script); // title, bars, text
    const captions = [{ text: "Hello", startMs: 0, endMs: 1500 }, { text: "Final", startMs: 1500, endMs: 3200 }];
    const { props } = assembleProps({
      sections,
      captionWords: captions,
      voiceoverSrc: "x.mp3",
      fps: 30,
      totalFrames: 96,
      imagesBySection: [[{ src: "a.png" }, { src: "b.png" }], [{ src: "c.png" }], []],
    });
    expect(props.sections[0].kind).toBe("montage"); // title + images → montage
    expect(props.sections[0].images).toHaveLength(2);
    expect(props.sections[0].heading).toBe("Big Title");
    expect(props.sections[1].kind).toBe("bars"); // bars keeps its chart even with an image
    expect(props.sections[2].kind).toBe("text"); // no images → plain card
  });

  it("keeps a diagram section as a diagram even when images are present", () => {
    const sections = parseScript(
      '## Stack (diagram)\n\nSpoken words here.\n[VISUAL: diagram — "The stack" | stack | "Prompt*; Context; Loop"]\n',
    );
    const captions = [{ text: "Spoken", startMs: 0, endMs: 3200 }];
    const { props } = assembleProps({
      sections,
      captionWords: captions,
      voiceoverSrc: "x.mp3",
      fps: 30,
      totalFrames: 96,
      imagesBySection: [[{ src: "a.png" }, { src: "b.png" }]], // images exist, but diagram wins
    });
    expect(props.sections[0].kind).toBe("diagram");
    expect(props.sections[0].layout).toBe("stack");
    expect(props.sections[0].nodes.map((nd) => nd.label)).toEqual(["Prompt", "Context", "Loop"]);
    expect(props.sections[0].nodes[0].active).toBe(true);
    expect(props.sections[0].images).toBeUndefined();
  });
});
