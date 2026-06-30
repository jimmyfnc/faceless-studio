import { describe, it, expect } from "vitest";
import { loadLlmConfig, createLlm } from "../tools/lib/llm.mjs";

describe("loadLlmConfig — bring your own LLM via env", () => {
  it("defaults to agent (no token needed) with no env", () => {
    expect(loadLlmConfig({}).provider).toBe("agent");
  });

  it("switches to an OpenAI-compatible api when a base URL is set (e.g. Ollama)", () => {
    const c = loadLlmConfig({
      RESEARCH_LLM_BASE_URL: "http://localhost:11434/v1/",
      RESEARCH_LLM_MODEL: "llama3.1",
    });
    expect(c).toMatchObject({ provider: "api", baseUrl: "http://localhost:11434/v1", model: "llama3.1" });
  });

  it("uses OPENAI_API_KEY as the credential when api is selected (explicit)", () => {
    const c = loadLlmConfig({ RESEARCH_LLM: "api", OPENAI_API_KEY: "sk-x" });
    expect(c.provider).toBe("api");
    expect(c.apiKey).toBe("sk-x");
    expect(c.baseUrl).toBe("https://api.openai.com/v1");
  });

  it("does NOT auto-switch to api just because OPENAI_API_KEY is present", () => {
    expect(loadLlmConfig({ OPENAI_API_KEY: "sk-x" }).provider).toBe("agent");
  });

  it("honours RESEARCH_LLM=agent even if a base URL is present", () => {
    expect(loadLlmConfig({ RESEARCH_LLM: "agent", RESEARCH_LLM_BASE_URL: "x" }).provider).toBe("agent");
  });
});

describe("createLlm", () => {
  it("agent provider is unconfigured and complete() explains the options", async () => {
    const llm = createLlm({ provider: "agent" });
    expect(llm.configured).toBe(false);
    await expect(llm.complete({ prompt: "x" })).rejects.toThrow(/bring your own LLM|RESEARCH_LLM/i);
  });

  it("api provider posts an OpenAI-compatible request and returns the content", async () => {
    const calls = [];
    const fetchImpl = async (url, opts) => {
      calls.push({ url, opts });
      return { ok: true, json: async () => ({ choices: [{ message: { content: "hello" } }] }) };
    };
    const llm = createLlm({ provider: "api", baseUrl: "https://api.x/v1", model: "m", apiKey: "k" }, { fetchImpl });
    const out = await llm.complete({ system: "sys", prompt: "hi", json: true });

    expect(out).toBe("hello");
    expect(calls[0].url).toBe("https://api.x/v1/chat/completions");
    const body = JSON.parse(calls[0].opts.body);
    expect(body.model).toBe("m");
    expect(body.messages[0]).toEqual({ role: "system", content: "sys" });
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(calls[0].opts.headers.Authorization).toBe("Bearer k");
  });

  it("omits Authorization when there is no key (local model)", async () => {
    let headers;
    const fetchImpl = async (_u, opts) => {
      headers = opts.headers;
      return { ok: true, json: async () => ({ choices: [{ message: { content: "" } }] }) };
    };
    const llm = createLlm(
      { provider: "api", baseUrl: "http://localhost:11434/v1", model: "llama3.1", apiKey: "" },
      { fetchImpl },
    );
    await llm.complete({ prompt: "x" });
    expect(headers.Authorization).toBeUndefined();
  });
});
