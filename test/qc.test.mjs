import { describe, it, expect } from "vitest";
import {
  loadQcConfig,
  parseQcVerdict,
  summarizeReport,
  createVision,
  buildQcPrompt,
} from "../tools/lib/qc.mjs";

describe("loadQcConfig", () => {
  it("defaults to the agent provider with no env", () => {
    expect(loadQcConfig({}).provider).toBe("agent");
  });

  it("switches to api when a base URL is set, normalizing the trailing slash", () => {
    const c = loadQcConfig({ QC_VISION_BASE_URL: "http://localhost:11434/v1/", QC_VISION_MODEL: "llava" });
    expect(c).toMatchObject({ provider: "api", baseUrl: "http://localhost:11434/v1", model: "llava" });
  });

  it("honors an explicit agent override even with a key present", () => {
    expect(loadQcConfig({ QC_VISION: "agent", QC_VISION_API_KEY: "x" }).provider).toBe("agent");
  });
});

describe("parseQcVerdict", () => {
  it("passes a clean image", () => {
    const v = parseQcVerdict('{"hasText":false,"anatomy":false,"garbled":false,"offBrand":false,"notes":"ok"}');
    expect(v.verdict).toBe("pass");
    expect(v.reasons).toEqual([]);
  });

  it("flags defects and collects hinted reasons (tolerating code fences)", () => {
    const v = parseQcVerdict('```json\n{"hasText":true,"textHint":"reads BATES","anatomy":true,"anatomyHint":"two hands overlap"}\n```');
    expect(v.verdict).toBe("flag");
    expect(v.hasText).toBe(true);
    expect(v.reasons).toEqual(["text: reads BATES", "anatomy: two hands overlap"]);
  });

  it("flags an unparseable response rather than silently passing", () => {
    const v = parseQcVerdict("the image looks fine to me");
    expect(v.verdict).toBe("flag");
    expect(v.reasons[0]).toMatch(/unparseable/);
  });
});

describe("summarizeReport", () => {
  it("counts passes and lists only the flagged files", () => {
    const s = summarizeReport([
      { file: "a.png", verdict: "pass", reasons: [] },
      { file: "b.png", verdict: "flag", reasons: ["text: STOP"] },
    ]);
    expect(s).toEqual({
      total: 2,
      passed: 1,
      flagged: [{ file: "b.png", reasons: ["text: STOP"] }],
    });
  });
});

describe("createVision (api)", () => {
  it("posts an OpenAI-style vision message with a data URL and returns the content", async () => {
    let captured;
    const fetchImpl = async (url, opts) => {
      captured = { url, body: JSON.parse(opts.body) };
      return { ok: true, json: async () => ({ choices: [{ message: { content: '{"hasText":false}' } }] }) };
    };
    const v = createVision({ provider: "api", baseUrl: "http://x/v1", model: "llava", apiKey: "k" }, { fetchImpl });
    const out = await v.inspect({ imageBase64: "AAAA", mimetype: "image/png", prompt: buildQcPrompt("clay") });
    expect(out).toBe('{"hasText":false}');
    expect(captured.url).toBe("http://x/v1/chat/completions");
    const img = captured.body.messages[1].content.find((c) => c.type === "image_url");
    expect(img.image_url.url).toBe("data:image/png;base64,AAAA");
  });

  it("the agent provider cannot inspect headlessly", async () => {
    const v = createVision({ provider: "agent" });
    expect(v.configured).toBe(false);
    await expect(v.inspect({})).rejects.toThrow(/bring your own|configured/i);
  });
});
