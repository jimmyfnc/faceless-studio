/**
 * Image QC — catch the classic generative defects before they ship:
 * baked-in text/letters, anatomy errors (extra or fused hands/fingers/limbs),
 * melted/garbled geometry, and anything wildly off the channel's style.
 *
 * Pluggable vision provider, same shape as the research LLM seam (no lock-in):
 *  - "agent"  (default): Claude Code is the vision model — it reads each image
 *    in-session and fills the report. `inspect()` is unavailable headlessly.
 *  - "api"    (bring your own): any OpenAI-compatible *vision* chat endpoint.
 *    Set QC_VISION_BASE_URL + QC_VISION_MODEL (+ QC_VISION_API_KEY if needed).
 *    Works with OpenAI (gpt-4o-mini), OpenRouter, Together — and local/free
 *    Ollama or LM Studio running a vision model (llava, qwen2-vl, ...).
 *
 * Library-first and pure (no fs): the CLI (`tools/qc.mjs`) and the future web
 * app call these. The parse/summarize/config helpers are unit-tested.
 */

/** Read the vision-QC config from the environment. */
export function loadQcConfig(env = process.env) {
  const explicit = (env.QC_VISION || "").toLowerCase().trim();
  const hasApi = explicit === "api" || Boolean(env.QC_VISION_BASE_URL || env.QC_VISION_API_KEY);
  if (explicit === "agent" || (!explicit && !hasApi)) {
    return { provider: "agent" };
  }
  return {
    provider: "api",
    baseUrl: (env.QC_VISION_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, ""),
    model: env.QC_VISION_MODEL || "gpt-4o-mini",
    apiKey: env.QC_VISION_API_KEY || env.OPENAI_API_KEY || "",
  };
}

export const QC_SYSTEM =
  "You are a meticulous QC reviewer for AI-generated illustrations. You only " +
  "report defects you can actually see. Reply with strict JSON, no prose.";

/**
 * The per-image instruction. `styleNote` is the channel's intended look, so the
 * model can judge "off-brand" against the right target.
 */
export function buildQcPrompt(styleNote = "") {
  return (
    "Inspect this single AI-generated image for defects. Check, in order:\n" +
    "1. text — any letters, words, numbers, or fake text-like squiggles baked into the image.\n" +
    "2. anatomy — extra/missing/fused hands, fingers, or limbs; a hand resting on another hand; impossible joints.\n" +
    "3. garbled — melted, smeared, or nonsensical shapes that don't read as a real object.\n" +
    "4. offBrand — far from the intended style" +
    (styleNote ? `: "${styleNote}"` : "") +
    ".\n\n" +
    'Return ONLY this JSON: {"hasText":bool,"textHint":string,"anatomy":bool,"anatomyHint":string,' +
    '"garbled":bool,"garbledHint":string,"offBrand":bool,"notes":string}. ' +
    "Set a boolean true only when you are confident. Keep hints under 12 words."
  );
}

const asBool = (v) => v === true || v === "true" || v === 1 || v === "yes";

/**
 * Parse a vision model's JSON reply into a normalized verdict. Tolerant of code
 * fences and stray prose; `verdict` is "flag" if any defect is true, else "pass".
 * @returns {{verdict:"pass"|"flag", hasText:boolean, anatomy:boolean, garbled:boolean, offBrand:boolean, reasons:string[], notes:string, raw?:string}}
 */
export function parseQcVerdict(text) {
  let obj;
  try {
    const m = String(text).match(/\{[\s\S]*\}/);
    if (!m) throw new Error("no JSON object");
    obj = JSON.parse(m[0]);
  } catch {
    return {
      verdict: "flag",
      hasText: false,
      anatomy: false,
      garbled: false,
      offBrand: false,
      reasons: ["unparseable QC response"],
      notes: String(text).slice(0, 200),
      raw: String(text).slice(0, 400),
    };
  }
  const hasText = asBool(obj.hasText);
  const anatomy = asBool(obj.anatomy);
  const garbled = asBool(obj.garbled);
  const offBrand = asBool(obj.offBrand);
  const reasons = [];
  if (hasText) reasons.push(`text${obj.textHint ? `: ${obj.textHint}` : ""}`);
  if (anatomy) reasons.push(`anatomy${obj.anatomyHint ? `: ${obj.anatomyHint}` : ""}`);
  if (garbled) reasons.push(`garbled${obj.garbledHint ? `: ${obj.garbledHint}` : ""}`);
  if (offBrand) reasons.push("off-brand");
  return {
    verdict: reasons.length ? "flag" : "pass",
    hasText,
    anatomy,
    garbled,
    offBrand,
    reasons,
    notes: typeof obj.notes === "string" ? obj.notes : "",
  };
}

/** Roll a list of `{file, ...verdict}` results into pass/flag counts + the flagged list. */
export function summarizeReport(results) {
  const flagged = results.filter((r) => r.verdict === "flag");
  return {
    total: results.length,
    passed: results.length - flagged.length,
    flagged: flagged.map((r) => ({ file: r.file, reasons: r.reasons })),
  };
}

const AGENT_HELP =
  "No vision model configured. Run agent-driven inside Claude Code (the agent " +
  "reviews each image), or bring your own:\n" +
  "  set QC_VISION_BASE_URL + QC_VISION_MODEL (+ QC_VISION_API_KEY).\n" +
  "  e.g. local Ollama: QC_VISION_BASE_URL=http://localhost:11434/v1 QC_VISION_MODEL=llava";

/**
 * Create a vision client from a config. `fetchImpl` is injectable for tests.
 * Returns `{ provider, configured, inspect({ imageBase64, mimetype, prompt, system }) }`.
 */
export function createVision(config = loadQcConfig(), { fetchImpl = fetch } = {}) {
  if (config.provider !== "api") {
    return {
      provider: "agent",
      configured: false,
      async inspect() {
        throw new Error(AGENT_HELP);
      },
    };
  }
  return {
    provider: "api",
    configured: true,
    model: config.model,
    baseUrl: config.baseUrl,
    async inspect({ imageBase64, mimetype = "image/png", prompt, system = QC_SYSTEM }) {
      const body = {
        model: config.model,
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: `data:${mimetype};base64,${imageBase64}` } },
            ],
          },
        ],
        temperature: 0,
        response_format: { type: "json_object" },
      };
      const res = await fetchImpl(`${config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`vision request failed: ${res.status} ${await res.text()}`);
      const data = await res.json();
      return data.choices?.[0]?.message?.content ?? "";
    },
  };
}
