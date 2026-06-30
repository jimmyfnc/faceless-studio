# Roadmap

Active ideas ranked by effort. Move shipped items to `docs/archive/` and delete
the row. Live idea write-ups go in `docs/brainstorms/`.

Effort: 🟢 small · 🟡 medium · 🔴 large · ⚫ epic

## Pipeline

The 🟡 items below are sequenced as one dependency chain in
[brainstorms/voice-driven-pipeline.md](brainstorms/voice-driven-pipeline.md).
**Stage 1 (multi-channel foundation + brand-as-data) shipped in `0.2.0`.**
Remaining build order: Whisper → auto-draft.

| Idea | Effort | Notes |
|---|---|---|
| Whisper transcription step | 🟡 | **Stage 2 → 0.3.0.** `@remotion/install-whisper-cpp` → word timestamps → `channels/<id>/videos/<slug>/captions.json`; makes "voice drives timeline" real. See brainstorm. |
| Script → auto-draft generator | 🟡 | **Stage 3 → 0.4.0.** parse `script.md` sections + align to captions → emit `props.json`. See brainstorm. |
| Vertical Shorts variant | 🟢 | second `<Composition>` reusing `ExplainerVideo` at 1080×1920 |
| Brand font | 🟢 | swap system font for a real one via `@remotion/google-fonts` |
| End-to-end auto mode | 🔴 | topic → script → ElevenLabs scratch VO → draft → render, one command |
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
