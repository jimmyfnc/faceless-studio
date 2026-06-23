# Changelog

All notable changes to faceless-studio, newest first. Written for the user
("what changed for me"). Follows [Keep a Changelog](https://keepachangelog.com/)
and [Semantic Versioning](https://semver.org/) (`0.x` pre-launch → `1.0.0` at first shipped video).

## [0.1.0] — 2026-06-23

Initial scaffold — a code-driven explainer-video pipeline.

### Added
- Remotion project (1920×1080 @ 30fps) with a parametrized `ExplainerVideo`
  composition: Zod schema for visual editing + duration derived from sections.
- Scenes: animated `TitleCard`, spring-driven `BarChartScene` (value count-up),
  `TextScene`, and a word-synced `CaptionTrack`.
- Brand design tokens (`src/theme/tokens.ts`) — change once, re-skins every video.
- ComfyUI generation helper (`tools/comfyui-generate.mjs`) — run an exported
  API-format workflow and save images into `public/assets/<slug>/`.
- Project-scoped MCP servers (`.mcp.json`): Remotion docs + ElevenLabs (scratch
  TTS, sound effects, Scribe speech-to-text).
- `WORKFLOW.md` — the full record-voice → Whisper → auto-draft → polish → render
  → publish pipeline, plus a script template (`scripts/sample-topic.md`).
- Release hygiene: semver versioning, this changelog, a pre-commit hook
  (version + changelog + docs coupling), and the `docs/` workflow.
