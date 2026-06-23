# Roadmap

Active ideas ranked by effort. Move shipped items to `docs/archive/` and delete
the row. Live idea write-ups go in `docs/brainstorms/`.

Effort: 🟢 small · 🟡 medium · 🔴 large · ⚫ epic

## Pipeline

| Idea | Effort | Notes |
|---|---|---|
| Whisper transcription step | 🟡 | `@remotion/install-whisper-cpp` → word timestamps → captions JSON; makes "voice drives timeline" real (see skill `subtitles.md`) |
| Script → auto-draft generator | 🟡 | parse `scripts/<slug>.md` sections + captions → emit per-video props |
| Per-video content loading | 🟡 | `videos/<slug>/props.json` loaded via input props so making a video doesn't touch the `src/` engine (and doesn't bump the version) |
| Vertical Shorts variant | 🟢 | second `<Composition>` reusing `ExplainerVideo` at 1080×1920 |
| Brand font | 🟢 | swap system font for a real one via `@remotion/google-fonts` |
| End-to-end auto mode | 🔴 | topic → script → ElevenLabs scratch VO → draft → render, one command |
| YouTube upload + thumbnail | 🔴 | rclone backup + YouTube API; thumbnail via Nano Banana |
| Template library | ⚫ | listicle / cinematic templates beyond explainer |

## Maintenance

| Item | Effort | Notes |
|---|---|---|
| Pin/track Remotion version on upgrades | 🟢 | `npm run upgrade`; verify render after |
