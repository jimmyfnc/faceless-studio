/**
 * Openverse provider — keyless search of openly-licensed + public-domain images
 * (https://openverse.org). Returns license metadata per result, which feeds the
 * license filter + provenance. We ask Openverse for commercially-usable +
 * modifiable results, then re-check every result with our own policy.
 */

/** Map a raw Openverse result to our normalized candidate shape. (Pure.) */
export function normalizeOpenverseResult(r) {
  return {
    title: r.title || "",
    author: r.creator || "",
    license: r.license || "",
    licenseVersion: r.license_version || "",
    licenseUrl: r.license_url || "",
    source: r.source || "",
    provider: "openverse",
    pageUrl: r.foreign_landing_url || "",
    url: r.url || "", // direct image file URL
  };
}

/**
 * Search Openverse. `fetchImpl` is injectable for testing.
 * @returns {Promise<Array<object>>} normalized candidates
 */
export async function searchOpenverse(query, { count = 10, fetchImpl = fetch } = {}) {
  const params = new URLSearchParams({
    q: query,
    license_type: "commercial,modification", // exclude NC and ND at the source
    page_size: String(Math.min(Math.max(count, 1), 20)),
    mature: "false",
  });
  const res = await fetchImpl(`https://api.openverse.org/v1/images/?${params.toString()}`, {
    headers: { "User-Agent": "faceless-studio (asset sourcing)" },
  });
  if (!res.ok) throw new Error(`Openverse request failed: ${res.status}`);
  const data = await res.json();
  return (data.results || []).map(normalizeOpenverseResult);
}
