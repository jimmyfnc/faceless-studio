# Changelog

All notable changes to faceless-studio, newest first. Written for the user
("what changed for me"). Follows [Keep a Changelog](https://keepachangelog.com/)
and [Semantic Versioning](https://semver.org/) (`0.x` pre-launch → `1.0.0` at first shipped video).

## [0.2.0] — 2026-06-24

Multi-channel foundation — the engine is now reusable by other creators, and a
video's duration follows its voiceover.

### Added
- **Channels.** Per-creator brand + content live under `channels/<id>/`
  (`brand.json` + `videos/<slug>/{script.md, props.json}`), outside the `src/`
  engine. Making a video never touches the engine or bumps its version. Only the
  bundled `example-explainers` channel is tracked; your own channels are
  git-ignored, so your content stays yours.
- **Brand as data.** Colors + fonts moved out of `src/` into a `brandSchema` and
  a per-channel `brand.json`; every scene reads them via `useBrand()`. Re-skin a
  channel by editing its `brand.json` — no engine edit. `defaultBrand` is the
  fallback when a video supplies no brand.
- **Channel commands.** `npm run render -- <channel> <slug>` and
  `npm run studio -- <channel> <slug>` merge `brand.json` into the video's props
  and hand Remotion a single props file (required on Windows, where inline
  `--props` JSON is unsupported).
- Video duration now matches the voiceover when one is set (via
  `@remotion/media-parser`), falling back to the sum of section durations.
- Rewritten `README.md`: the engine/brand/content model, a setup/prerequisites
  guide (Node, hooks, ComfyUI, ElevenLabs, Whisper), and a "make your own
  channel" walkthrough.

### Changed
- The standalone `accentColor` prop folded into `brand.colors.accent`.
- The sample script moved to
  `channels/example-explainers/videos/compound-interest/script.md`.

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
