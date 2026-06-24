# Roadmap

Active ideas ranked by effort. Move shipped items to `docs/archive/` and delete
the row. Live idea write-ups go in `docs/brainstorms/`.

Effort: 🟢 small · 🟡 medium · 🔴 large · ⚫ epic

## Pipeline

The three 🟡 items below are sequenced as one dependency chain in
[brainstorms/voice-driven-pipeline.md](brainstorms/voice-driven-pipeline.md)
(build order: per-video loading → Whisper → auto-draft).

| Idea | Effort | Notes |
|---|---|---|
| Per-video content loading | 🟡 | **Stage 1 → 0.2.0.** `videos/<slug>/props.json` rendered via `--props` so making a video doesn't touch the `src/` engine; `calculateMetadata` derives duration from the VO. See brainstorm. |
| Whisper transcription step | 🟡 | **Stage 2 → 0.3.0.** `@remotion/install-whisper-cpp` → word timestamps → `captions.json`; makes "voice drives timeline" real. See brainstorm. |
| Script → auto-draft generator | 🟡 | **Stage 3 → 0.4.0.** parse `scripts/<slug>.md` sections + align to captions → emit `props.json`. See brainstorm. |
| Vertical Shorts variant | 🟢 | second `<Composition>` reusing `ExplainerVideo` at 1080×1920 |
| Brand font | 🟢 | swap system font for a real one via `@remotion/google-fonts` |
| End-to-end auto mode | 🔴 | topic → script → ElevenLabs scratch VO → draft → render, one command |
| YouTube upload + thumbnail | 🔴 | rclone backup + YouTube API; thumbnail via Nano Banana |
| Template library | ⚫ | listicle / cinematic templates beyond explainer |

## Maintenance

| Item | Effort | Notes |
|---|---|---|
| Pin/track Remotion version on upgrades | 🟢 | `npm run upgrade`; verify render after |
