/**
 * Pluggable LLM provider for the research stage — no vendor lock-in.
 *
 * Two ways to run, selected by env:
 *  - "agent"  (default): Claude Code is the LLM. `complete()` is unavailable
 *    headlessly — the agent produces the artifacts in-session.
 *  - "api"    (bring your own LLM): any OpenAI-compatible chat endpoint. Set
 *    RESEARCH_LLM_BASE_URL + RESEARCH_LLM_MODEL (+ RESEARCH_LLM_API_KEY if the
 *    endpoint needs one). This covers OpenAI, OpenRouter, Groq, Together,
 *    Mistral, DeepSeek, Azure — and local/free Ollama, LM Studio, vLLM.
 *
 * Examples:
 *   OpenAI:  RESEARCH_LLM_BASE_URL=https://api.openai.com/v1  MODEL=gpt-4o-mini  +key
 *   Ollama:  RESEARCH_LLM_BASE_URL=http://localhost:11434/v1  MODEL=llama3.1     (no key)
 */

/** Read the LLM config from the environment. */
export function loadLlmConfig(env = process.env) {
  const explicit = (env.RESEARCH_LLM || "").toLowerCase().trim();
  const hasApi = explicit === "api" || Boolean(env.RESEARCH_LLM_BASE_URL || env.RESEARCH_LLM_API_KEY);
  if (explicit === "agent" || (!explicit && !hasApi)) {
    return { provider: "agent" };
  }
  return {
    provider: "api",
    baseUrl: (env.RESEARCH_LLM_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, ""),
    model: env.RESEARCH_LLM_MODEL || "gpt-4o-mini",
    apiKey: env.RESEARCH_LLM_API_KEY || env.OPENAI_API_KEY || "",
  };
}

const AGENT_HELP =
  "No LLM configured. Run agent-driven inside Claude Code, or bring your own LLM:\n" +
  "  set RESEARCH_LLM_BASE_URL + RESEARCH_LLM_MODEL (+ RESEARCH_LLM_API_KEY).\n" +
  "  e.g. local Ollama: RESEARCH_LLM_BASE_URL=http://localhost:11434/v1 RESEARCH_LLM_MODEL=llama3.1";

/**
 * Create an LLM client from a config. `fetchImpl` is injectable for tests.
 * The returned client has `provider`, `configured`, and
 * `complete({ system, prompt, json })`.
 */
export function createLlm(config = loadLlmConfig(), { fetchImpl = fetch } = {}) {
  if (config.provider !== "api") {
    return {
      provider: "agent",
      configured: false,
      async complete() {
        throw new Error(AGENT_HELP);
      },
    };
  }
  return {
    provider: "api",
    configured: true,
    model: config.model,
    baseUrl: config.baseUrl,
    async complete({ system, prompt, json = false }) {
      const body = {
        model: config.model,
        messages: [
          system ? { role: "system", content: system } : null,
          { role: "user", content: prompt },
        ].filter(Boolean),
        temperature: 0.6,
        ...(json ? { response_format: { type: "json_object" } } : {}),
      };
      const res = await fetchImpl(`${config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`LLM request failed: ${res.status} ${await res.text()}`);
      const data = await res.json();
      return data.choices?.[0]?.message?.content ?? "";
    },
  };
}
