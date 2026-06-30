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

What works today (`0.5.0`): the middle + visuals — script → record → transcribe →
auto-draft → render long-form, with **image + video scenes** (photos, b-roll,
your own media). The gaps to the north star, in build order:

1. ~~**Visuals** — image/video scenes~~ ✅ shipped in `0.5.0`.
2. **Assets** — gather (licensed/PD) + generate (AI), now that scenes can show them.
3. **Front of funnel** — research → script.
4. **Multi-format** — short cuts for vertical platforms.
5. **Ends** — originality/licensing safeguards, then publish + automation.

## Pipeline (ranked toward the north star)

| Idea | Effort | Notes |
|---|---|---|
| Asset sourcing & generation | 🔴 | **Recommended next.** Now that `image`/`video` scenes exist (`0.5.0`): **AI-gen (ComfyUI) first** (we have `comfyui-generate.mjs`), then CC0/public-domain + permissive stock (NASA, Wikimedia, Openverse, Pexels) behind a license filter; per-asset provenance + attribution → `credits.json` (the scene `caption` shows it). Avoid CC-NC/ND and any music. |
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
