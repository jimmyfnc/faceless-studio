/**
 * Pluggable web-search provider for the research brief — mirrors the LLM seam.
 *
 *  - "agent" (default): the agent (Claude) does the searching; `search()` is
 *    unavailable headlessly.
 *  - "brave" / "tavily": set RESEARCH_SEARCH + a key for unattended runs.
 *
 *   setx RESEARCH_SEARCH brave   ; setx RESEARCH_SEARCH_API_KEY "..."
 *   setx RESEARCH_SEARCH tavily  ; setx RESEARCH_SEARCH_API_KEY "..."
 *
 * Normalized result shape: { title, url, snippet }.
 */

export function loadSearchConfig(env = process.env) {
  const p = (env.RESEARCH_SEARCH || "agent").toLowerCase().trim();
  if (p === "brave") return { provider: "brave", apiKey: env.RESEARCH_SEARCH_API_KEY || env.BRAVE_API_KEY || "" };
  if (p === "tavily") return { provider: "tavily", apiKey: env.RESEARCH_SEARCH_API_KEY || env.TAVILY_API_KEY || "" };
  return { provider: "agent" };
}

export function normalizeBrave(data) {
  return (data?.web?.results || []).map((r) => ({
    title: r.title || "",
    url: r.url || "",
    snippet: r.description || "",
  }));
}

export function normalizeTavily(data) {
  return (data?.results || []).map((r) => ({
    title: r.title || "",
    url: r.url || "",
    snippet: r.content || "",
  }));
}

const AGENT_HELP =
  "No search provider configured. Run agent-driven in Claude Code, or set " +
  "RESEARCH_SEARCH=brave|tavily + RESEARCH_SEARCH_API_KEY for headless runs.";

/** Create a search client. `fetchImpl` is injectable for tests. */
export function createSearch(config = loadSearchConfig(), { fetchImpl = fetch } = {}) {
  if (config.provider === "brave") {
    return {
      provider: "brave",
      configured: true,
      async search(query, { count = 6 } = {}) {
        const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}`;
        const res = await fetchImpl(url, {
          headers: { Accept: "application/json", "X-Subscription-Token": config.apiKey },
        });
        if (!res.ok) throw new Error(`Brave search failed: ${res.status}`);
        return normalizeBrave(await res.json());
      },
    };
  }
  if (config.provider === "tavily") {
    return {
      provider: "tavily",
      configured: true,
      async search(query, { count = 6 } = {}) {
        const res = await fetchImpl("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ api_key: config.apiKey, query, max_results: count }),
        });
        if (!res.ok) throw new Error(`Tavily search failed: ${res.status}`);
        return normalizeTavily(await res.json());
      },
    };
  }
  return {
    provider: "agent",
    configured: false,
    async search() {
      throw new Error(AGENT_HELP);
    },
  };
}
