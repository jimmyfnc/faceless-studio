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

What works today (`0.6.0`): script → record → transcribe → auto-draft → render
long-form, with **image + video scenes** and **copyright-safe asset sourcing**
(Openverse fetch + license filter + `credits.json`; ComfyUI/own via `--own`). The
gaps to the north star, in build order:

1. ~~**Visuals** — image/video scenes~~ ✅ `0.5.0`.
2. ~~**Assets** — licensed/PD fetch + provenance~~ ✅ `0.6.0` (more providers + ComfyUI wiring can follow).
3. **Front of funnel** — research → script (recommended next).
4. **Multi-format** — short cuts for vertical platforms.
5. **Ends** — originality/licensing safeguards, then publish + automation.

## Pipeline (ranked toward the north star)

| Idea | Effort | Notes |
|---|---|---|
| Research → script | 🔴 | **Recommended next.** Topic ideation + web research (`WebSearch`/`WebFetch`, `deep-research`) → `research.json` (outline + facts + sources) → a draft `script.md`. Front of the funnel — start from an idea, not a blank script. |
| More asset providers + ComfyUI wiring | 🟡 | Add NASA / Wikimedia / Pexels (key) providers behind the same license filter; run `comfyui-generate.mjs` from the pipeline and auto-register output via `--own`. Builds on the `0.6.0` asset core. |
| Research → script | 🔴 | Topic ideation + web research (`WebSearch`/`WebFetch`, `deep-research`) → `research.json` (outline + facts + sources) → a draft `script.md`. Front of the funnel. |
| Short cuts (Shorts/Reels/TikTok) | 🟡 | 9:16 composition reusing `ExplainerVideo`, plus auto-selecting highlight segments from the long-form → render vertical cuts per platform. |
| Originality & platform-safety | 🟡 | Provenance/`credits.json`, original script + VO + visuals, no unlicensed music; a pre-publish checklist so videos hold up against Content-ID + "reused content" policies. (Risk reduction, not a guarantee.) |
| Brand font | 🟢 | let `brand.json` name a Google font; load via `@remotion/google-fonts` (extends brand-as-data) |
| End-to-end auto mode | 🔴 | topic → research → script → scratch VO → assets → draft → render, one command (composes the rows above) |
| YouTube upload + thumbnail | 🔴 | rclone backup + YouTube API + multi-platform; thumbnail via Nano Banana |
| Template library | ⚫ | listicle / cinematic templates beyond explainer |

## App / UI

| Idea | Effort | Notes |
|---|---|---|
| Local web app for non-developers | ⚫ | **TODO (deferred).** Local Node server + React frontend (Next.js) wrapping the engine: channel/video library, brand + script editors, in-browser VO, asset picker, transcribe/auto-draft/render buttons, `@remotion/player` preview. Plan in [brainstorms/local-web-app.md](brainstorms/local-web-app.md). |

## Maintenance

| Item | Effort | Notes |
|---|---|---|
| Pin/track Remotion version on upgrades | 🟢 | `npm run upgrade`; verify render after |
