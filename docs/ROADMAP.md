# Roadmap

Active ideas ranked by effort. Move shipped items to `docs/archive/` and delete
the row. Live idea write-ups go in `docs/brainstorms/`.

Effort: 🟢 small · 🟡 medium · 🔴 large · ⚫ epic

## Pipeline

The 🟡 items below are sequenced as one dependency chain in
[brainstorms/voice-driven-pipeline.md](brainstorms/voice-driven-pipeline.md).
**Stage 1 (multi-channel foundation) shipped in `0.2.0`; Stage 2 (Whisper
transcription) shipped in `0.3.0`.** Remaining: auto-draft.

| Idea | Effort | Notes |
|---|---|---|
| Script → auto-draft generator | 🟡 | **Stage 3 → 0.4.0.** parse `script.md` sections + align to `captions.json` → emit `props.json` (durations derived from caption timings). See brainstorm. |
| Vertical Shorts variant | 🟢 | second `<Composition>` reusing `ExplainerVideo` at 1080×1920 |
| Brand font | 🟢 | swap system font for a real one via `@remotion/google-fonts` |
| Research & asset sourcing | 🔴 | **TODO (deferred).** Topic ideation + web research (`WebSearch`/`WebFetch`, `deep-research`) → `research.json` (outline + facts + source URLs). Copyright-safe media: **AI-gen (ComfyUI) first**, then CC0/public-domain + permissive stock (Pexels/Pixabay) behind a license filter, capturing per-asset provenance + attribution to `credits.json`. Avoid CC-NC/ND and any music. Front half of "End-to-end auto mode". |
| End-to-end auto mode | 🔴 | topic → script → ElevenLabs scratch VO → draft → render, one command (builds on Research + auto-draft) |
| YouTube upload + thumbnail | 🔴 | rclone backup + YouTube API; thumbnail via Nano Banana |
| Template library | ⚫ | listicle / cinematic templates beyond explainer |

## App / UI

| Idea | Effort | Notes |
|---|---|---|
| Local web app for non-developers | ⚫ | **TODO (deferred).** Local Node server + React frontend (Next.js) wrapping the engine: channel/video library, brand + script editors, in-browser VO, transcribe/auto-draft/render buttons, `@remotion/player` preview. Full architecture + phased plan in [brainstorms/local-web-app.md](brainstorms/local-web-app.md). Parked until the voice-pipeline MVP lands; build Stages 2–3 as importable modules so the app can reuse them. |

## Maintenance

| Item | Effort | Notes |
|---|---|---|
| Pin/track Remotion version on upgrades | 🟢 | `npm run upgrade`; verify render after |
