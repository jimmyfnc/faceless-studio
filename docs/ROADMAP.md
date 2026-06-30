# Roadmap

Live idea write-ups go in `docs/brainstorms/`. Move shipped items to
`docs/archive/` and delete the row.

Effort: 🟢 small · 🟡 medium · 🔴 large · ⚫ epic

## North star

> Idea → **research** → **script** → **assets** (AI-generated + licensed/public-domain
> + your own) → **your VO** → transcribe → auto-draft → place media → polish →
> render **long-form + short cuts** → safeguard originality + licensing → **publish**,
> automated as far as possible — and **original by construction** so it holds up on
> YouTube / Shorts / TikTok / Reels.

The full funnel runs today (`0.9.0`): idea → **research** (plan + brief → script,
bring-your-own LLM/search) → script → record VO → transcribe → auto-draft →
**assets** (license-safe fetch + own/AI-gen) → render **long-form + vertical short**.

| ✅ Shipped | Version |
|---|---|
| Voice pipeline (transcribe → auto-draft → render) | `0.2.0`–`0.4.0` |
| Image + video scenes | `0.5.0` |
| Copyright-safe asset sourcing | `0.6.0` |
| Research (plan + brief → script, BYO LLM/search) | `0.7.0`–`0.8.0` |
| Vertical short cuts | `0.9.0` |

What's left toward the north star: originality/licensing safeguards, then publish
+ automation.

## Pipeline (ranked toward the north star)

| Idea | Effort | Notes |
|---|---|---|
| Originality & platform-safety | 🟡 | **Recommended next.** A pre-publish check + report: confirm every asset is in `credits.json` and license-safe, the script/VO/visuals are original, no unlicensed music, and surface the attribution block for the description. Risk reduction, not a guarantee. |
| Smarter short-cut selection | 🟢 | Beyond the leading window: pick the punchiest segment (hook + payoff, or LLM-chosen), and per-scene portrait polish. Builds on `0.9.0`. |
| More asset providers + ComfyUI wiring | 🟡 | NASA / Wikimedia / Pexels (key) providers behind the same license filter; run `comfyui-generate.mjs` from the pipeline and auto-register output via `--own`. |
| Brand font | 🟢 | let `brand.json` name a Google font; load via `@remotion/google-fonts` (extends brand-as-data). |
| Publish (YouTube + multi-platform) | 🔴 | rclone backup + YouTube API + Shorts/TikTok/Reels; thumbnail via Nano Banana. |
| End-to-end auto mode | 🔴 | topic → research → script → scratch VO → assets → draft → render long-form + short, one command (composes the rows above). |
| Template library | ⚫ | listicle / cinematic templates beyond explainer. |

## App / UI

| Idea | Effort | Notes |
|---|---|---|
| Local web app for non-developers | ⚫ | **TODO (deferred).** Local Node server + React frontend (Next.js) wrapping the engine: channel/video library, brand + script editors, in-browser VO, asset picker, transcribe/auto-draft/render buttons, `@remotion/player` preview. Plan in [brainstorms/local-web-app.md](brainstorms/local-web-app.md). |

## Maintenance

| Item | Effort | Notes |
|---|---|---|
| Pin/track Remotion version on upgrades | 🟢 | `npm run upgrade`; verify render after |
