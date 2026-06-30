/**
 * License policy + provenance for copyright-safe asset sourcing.
 *
 * This is the safety-critical core: it decides whether a media asset is usable
 * on a *monetized* channel, what attribution it needs, and assembles the
 * `credits.json` + a ready-to-paste attribution block. Conservative by default —
 * anything unrecognized is blocked. Pure (no I/O) and heavily unit-tested.
 *
 * NOT legal advice. It reduces risk by filtering licenses and recording
 * provenance; you confirm before publishing.
 */

const LABELS = {
  cc0: "CC0",
  pdm: "Public Domain",
  publicdomain: "Public Domain",
  "public-domain": "Public Domain",
  by: "CC BY",
  "by-sa": "CC BY-SA",
  own: "Your own / AI-generated",
  generated: "Your own / AI-generated",
};

/** Human label for a license id. */
export function licenseLabel(license) {
  const l = String(license || "").toLowerCase().trim();
  return LABELS[l] || (l ? l.toUpperCase() : "Unknown");
}

/**
 * Decide whether a license is safe for a monetized/commercial channel.
 * @returns {{ allowed: boolean, requiresAttribution: boolean, reason: string }}
 */
export function assessLicense(license) {
  const l = String(license || "").toLowerCase().trim();
  if (!l) return { allowed: false, requiresAttribution: true, reason: "missing/unknown license" };

  // Your own or AI-generated content — you hold the rights.
  if (l === "own" || l === "generated") {
    return { allowed: true, requiresAttribution: false, reason: "your own / AI-generated" };
  }
  // Non-commercial and No-Derivatives are not usable: NC bans monetization,
  // ND bans editing the asset into a video.
  if (l.includes("nc")) return { allowed: false, requiresAttribution: true, reason: "non-commercial (NC)" };
  if (l.includes("nd")) {
    return { allowed: false, requiresAttribution: true, reason: "no-derivatives (ND) — can't edit into a video" };
  }
  // Public domain / CC0 — no attribution required (but we still record it).
  if (l === "cc0" || l === "pdm" || l === "publicdomain" || l === "public-domain") {
    return { allowed: true, requiresAttribution: false, reason: "public domain / CC0" };
  }
  // Attribution licenses — usable with credit (SA also requires share-alike).
  if (l === "by" || l === "cc-by") {
    return { allowed: true, requiresAttribution: true, reason: "CC BY — attribution required" };
  }
  if (l === "by-sa" || l === "cc-by-sa") {
    return { allowed: true, requiresAttribution: true, reason: "CC BY-SA — attribution + share-alike" };
  }
  // Anything else: block (conservative default).
  return { allowed: false, requiresAttribution: true, reason: `unrecognized license "${l}"` };
}

/** Keep only license-safe candidates. */
export function filterByLicense(candidates) {
  return candidates.filter((c) => assessLicense(c.license).allowed);
}

/** A single attribution string for an asset (for the scene caption / description). */
export function attributionLine(a) {
  const { requiresAttribution } = assessLicense(a.license);
  const label = licenseLabel(a.license);
  if (!requiresAttribution) {
    const who = a.source || a.author || a.provider || "source";
    return `${a.title ? `“${a.title}” — ` : ""}${who} (${label})`;
  }
  const link = a.pageUrl || a.url || "";
  return `“${a.title || "Untitled"}” by ${a.author || "Unknown"} — ${label}${link ? ` — ${link}` : ""}`;
}

/**
 * Build a credits.json structure from assets (each must carry license info).
 * Disallowed assets are recorded with `allowed: false` rather than silently
 * dropped, so nothing unsafe slips through unnoticed.
 * @returns {{ assets: object[], attributionBlock: string }}
 */
export function buildCredits(assets) {
  const enriched = assets.map((a) => {
    const assessment = assessLicense(a.license);
    return {
      ...a,
      licenseLabel: licenseLabel(a.license),
      allowed: assessment.allowed,
      requiresAttribution: assessment.requiresAttribution,
      attribution: attributionLine(a),
    };
  });
  const lines = enriched
    .filter((a) => a.allowed)
    .map((a) => `- ${a.attribution}`);
  const attributionBlock = lines.length ? `Credits / attribution:\n${lines.join("\n")}` : "";
  return { assets: enriched, attributionBlock };
}
