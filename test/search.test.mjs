import { describe, it, expect } from "vitest";
import {
  loadSearchConfig,
  createSearch,
  normalizeBrave,
  normalizeTavily,
} from "../tools/lib/search.mjs";

describe("loadSearchConfig", () => {
  it("defaults to agent", () => {
    expect(loadSearchConfig({}).provider).toBe("agent");
  });
  it("selects brave/tavily explicitly and reads the key", () => {
    expect(loadSearchConfig({ RESEARCH_SEARCH: "brave", RESEARCH_SEARCH_API_KEY: "b" })).toMatchObject({
      provider: "brave",
      apiKey: "b",
    });
    expect(loadSearchConfig({ RESEARCH_SEARCH: "tavily", TAVILY_API_KEY: "t" })).toMatchObject({
      provider: "tavily",
      apiKey: "t",
    });
  });
  it("does not auto-switch just because a key is present", () => {
    expect(loadSearchConfig({ BRAVE_API_KEY: "b" }).provider).toBe("agent");
  });
});

describe("normalizers", () => {
  it("normalizes Brave results", () => {
    expect(normalizeBrave({ web: { results: [{ title: "T", url: "u", description: "d" }] } })).toEqual([
      { title: "T", url: "u", snippet: "d" },
    ]);
  });
  it("normalizes Tavily results", () => {
    expect(normalizeTavily({ results: [{ title: "T", url: "u", content: "c" }] })).toEqual([
      { title: "T", url: "u", snippet: "c" },
    ]);
  });
  it("tolerates empty/missing payloads", () => {
    expect(normalizeBrave({})).toEqual([]);
    expect(normalizeTavily(undefined)).toEqual([]);
  });
});

describe("createSearch", () => {
  it("agent provider is unconfigured and search() explains the options", async () => {
    const s = createSearch({ provider: "agent" });
    expect(s.configured).toBe(false);
    await expect(s.search("x")).rejects.toThrow(/RESEARCH_SEARCH|agent-driven/i);
  });

  it("brave hits the right endpoint with the token header and normalizes", async () => {
    let captured;
    const fetchImpl = async (url, opts) => {
      captured = { url, opts };
      return { ok: true, json: async () => ({ web: { results: [{ title: "T", url: "u", description: "d" }] } }) };
    };
    const s = createSearch({ provider: "brave", apiKey: "key" }, { fetchImpl });
    const out = await s.search("mars rovers");
    expect(captured.url).toContain("https://api.search.brave.com/res/v1/web/search?q=mars%20rovers");
    expect(captured.opts.headers["X-Subscription-Token"]).toBe("key");
    expect(out).toEqual([{ title: "T", url: "u", snippet: "d" }]);
  });

  it("tavily posts the query + key and normalizes", async () => {
    let captured;
    const fetchImpl = async (url, opts) => {
      captured = { url, opts };
      return { ok: true, json: async () => ({ results: [{ title: "T", url: "u", content: "c" }] }) };
    };
    const s = createSearch({ provider: "tavily", apiKey: "key" }, { fetchImpl });
    const out = await s.search("q");
    expect(captured.url).toBe("https://api.tavily.com/search");
    const body = JSON.parse(captured.opts.body);
    expect(body).toMatchObject({ api_key: "key", query: "q" });
    expect(out).toEqual([{ title: "T", url: "u", snippet: "c" }]);
  });
});
