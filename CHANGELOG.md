# Changelog

All notable changes to faceless-studio, newest first. Written for the user
("what changed for me"). Follows [Keep a Changelog](https://keepachangelog.com/)
and [Semantic Versioning](https://semver.org/) (`0.x` pre-launch → `1.0.0` at first shipped video).

## [0.17.0] — 2026-07-01

Livelier montage motion — image-backed sections stop feeling like a slideshow.

### Changed
- **Montage images now truly crossfade** — the outgoing image holds while the
  incoming one fades in on top, so there's no dip to the background between
  images (and a section no longer opens on a dark frame).
- **Each image gets its own camera move.** Instead of the same slow zoom on
  every image, images cycle through six Ken Burns moves — push in, pull back,
  pan left/right, diagonal drifts — so two consecutive images never move the
  same way. Pan distances stay inside the zoom's over-scan, so edges never show.

## [0.16.0] — 2026-07-01

One-step curation — picking a winner is now a command, not manual file surgery.

### Added
- **`npm run pick -- <channel> <slug> s03a=1 s05b=3`** promotes each winning
  candidate from `generate --candidates N` to the canonical filename, deletes the
  other candidates, and rewrites `credits.json` so the winner's provenance (which
  model made it) carries over. Pure planning logic (`tools/lib/pick.mjs`), tested.
- The full image loop is now: edit `images.json` → `generate` → `qc` → reword
  flagged prompts → `generate --flagged --candidates 3` → `pick` → `qc` clean.
  Documented in WORKFLOW.md.

### Fixed
- Auto-draft no longer sweeps unpicked candidate files (`s03a-2.png`, …) into a
  section's montage — only canonical images are drafted.

## [0.15.0] — 2026-07-01

Image manifest — a video's generated images become first-class content, with
per-image model routing.

### Added
- **`channels/<ch>/videos/<slug>/images.json`** declares every generated image
  next to the script it illustrates: `{ name, label, prompt, workflow?, negative? }`
  plus manifest-wide `defaults`. Prompts are now versioned with the video instead
  of living in ad-hoc files, so any image can be regenerated later.
- **`npm run generate -- <ch> <slug>`** now reads that manifest by default (an
  explicit prompts-file path still works). New selection modes: **`--only a,b`**
  regenerates named entries; **`--flagged`** regenerates exactly what the last
  `npm run qc` flagged — closing the QC → regenerate loop.
- **Per-image model routing:** an entry's `workflow` (e.g. `"qwen-image"` for
  character/hand shots) overrides the manifest default, which overrides
  `--workflow`. Provenance in `credits.json` records which model made each file.
- **Per-image negative prompts:** entry/default `negative` is appended to the
  workflow's negative (effective on real-CFG models like Qwen; schnell ignores it).
- The manifest helpers (`tools/lib/images.mjs`) are pure and unit-tested.

## [0.14.0] — 2026-07-01

Qwen-Image — a sharper, commercial-safe image model option (better hands, and
negative prompts that actually work).

### Added
- **`workflows/qwen-image.json`** — Qwen-Image (Apache-2.0) via ComfyUI's native
  support (no custom nodes). Much stronger anatomy than FLUX schnell, and it runs
  at real CFG so **negative prompts apply** — an anatomy/text negative is baked
  into the workflow. Use it with
  `npm run generate -- <ch> <slug> <prompts.json> --workflow workflows/qwen-image.json`.
  Best for character/hand shots; ~20 steps (slower than schnell's 4-step).

### Fixed
- **`generate`** no longer times out on the first image of a heavy model. Qwen's
  ~19 GB load can exceed the old 180 s per-image poll window; the timeout is now
  600 s and configurable via `COMFYUI_TIMEOUT_MS`.

## [0.13.0] — 2026-06-30

Deeper research briefs — scripts that actually teach.

### Changed
- The brief prompt now targets a runtime (`~5 min` by default, ~140 words/min),
  asks for **9–16 sections each with a concrete example**, and demands real
  teaching (a before/after, a number, a tiny scenario) over just name-dropping —
  so a drafted script is substantial enough to hold up as a YouTube explainer
  instead of a 60-second skim.

## [0.12.0] — 2026-06-30

Image QC — catch generative defects before they ship.

### Added
- **`npm run qc -- <channel> <slug>`** reviews every generated image for baked-in
  text, bad anatomy (extra/fused/overlapping hands), garbled shapes, and
  off-brand style, then writes `qc-report.json` listing the images to regenerate
  (and exits non-zero when anything is flagged, so it can gate a build).
- Pluggable vision provider, same seam as research: **agent-driven by default**
  (Claude Code reviews the batch in-session and fills the report); or **bring your
  own** OpenAI-compatible *vision* endpoint with `QC_VISION_BASE_URL` +
  `QC_VISION_MODEL` (+ key) — including a free local Ollama / LM Studio model.

## [0.11.0] — 2026-06-30

Batch image generation — make a whole video's worth of on-brand stills at once.

### Added
- **`npm run generate -- <channel> <slug> <prompts.json>`** runs a ComfyUI
  workflow once per prompt, saves each image with a predictable name
  (`s01a.png`, …), and registers it in `credits.json` (license `own`). It reads
  the channel's `style.json` `imageStyle` as the default style, so every image
  matches the channel look. `--candidates N` renders N variations per prompt for
  curation; `--workflow` selects the workflow.
- Bundled API-format ComfyUI workflows under `workflows/`: **`flux-schnell`**
  (Apache-licensed, 4-step, a big quality jump over SDXL base), plus `sdxl` and
  `animagine`.

## [0.10.0] — 2026-06-30

Richer visuals — two new scene types, so a video isn't just charts and cards.

### Added
- **Montage scene** — a sequence of full-frame images that crossfade with a slow
  Ken Burns push, a concept label top-left, and a legibility gradient behind the
  captions. This is the "lots going on" look: images change every few seconds
  behind the narration. Auto-draft turns any image-backed section into a montage
  (drop `s01*.png`, `s02*.png`, … into the video's asset folder).
- **Diagram scene** — engine-drawn, so it can't hallucinate or bake in garbled
  text. Three layouts, nodes revealed one at a time with a spring: `flow` (a
  left→right pipeline), `steps` (a numbered list), and `stack` (slabs built
  bottom-up, active layer highlighted). Author it from the script:
  `[VISUAL: diagram — "Heading" | flow | "A; B*; C"]` (a `*` marks the active node).

### Changed
- The `ExplainerVideo` section switch now covers montage + diagram; auto-draft
  emits both, and a diagram section opts out of the montage image-upgrade even
  when matching images exist.

## [0.9.1] — 2026-06-30

### Changed
- **Captions are now easier to read.** Instead of sliding word-by-word, they
  show one **phrase block at a time** — the block holds still while it's spoken
  (active word highlighted in the accent), then the next block takes over. Blocks
  break at sentence punctuation or every ~6 words (`chunkCaptions`; tune via
  `CaptionTrack`'s `maxWords`). Applies to every video.

## [0.9.0] — 2026-06-30

Short cuts — one source now yields a long-form video *and* a vertical short for
Shorts / Reels / TikTok.

### Added
- **`npm run short -- <channel> <slug> [seconds]`** (default `30`) trims the
  long-form to a leading window (the hook/teaser), keeps the voiceover + captions
  for that window, and renders a new **`ExplainerShort`** composition at 1080×1920
  → `out/<channel>-<slug>-short.mp4`.
- The trim logic (`tools/lib/short.mjs`) is pure and tested: whole scenes are kept
  while they fit and the boundary scene is truncated to land on the exact length;
  a video shorter than the target is returned whole.
- The bar-chart scene is now **portrait-aware** — it centers vertically in 9:16
  instead of leaving a big empty top or crowding the captions.

### Changed
- `seconds` is a positional arg (not `--seconds`) because npm doesn't forward a
  second `--flag` to scripts.

## [0.8.0] — 2026-06-30

Research brief → script — the front of the funnel is complete: an idea becomes a
sourced, draft `script.md`.

### Added
- **`npm run research -- brief <channel> <slug> "<angle>"`** researches a chosen
  angle (web search → facts + sources → LLM) into `research.json` + a draft
  `script.md` that flows straight into `transcribe` → `draft`.
- **`npm run research -- script <channel> <slug> brief.json`** formats a brief
  (produced by the agent or any LLM) into the same artifacts — deterministic, no
  LLM needed. This is the clean agent-driven path: Claude searches + writes the
  brief, the CLI formats it.
- **Pluggable web search** (`tools/lib/search.mjs`): agent-driven by default; bring
  your own with `RESEARCH_SEARCH=brave|tavily` + `RESEARCH_SEARCH_API_KEY`. Mirrors
  the LLM seam.
- The generated `script.md` carries title/text/bars/image scenes with `[VISUAL]`
  notes and a Sources list, and parses straight back through auto-draft.

### Changed
- The research CLI now uses **positional sub-commands** (`plan` / `brief` /
  `script`) instead of `--`-flags, because npm doesn't reliably forward a second
  `--flag` to scripts. So plan is now `npm run research -- plan <channel> "<topic>"`.

## [0.7.0] — 2026-06-30

Research — start from an idea, and bring your own LLM. This is the front of the
funnel: narrow a topic to one video or a series.

### Added
- **`npm run research -- <channel> "<topic>"`** plans a topic: a `single`-vs-`series`
  assessment with a rationale, sharp single-video **angles**, and — when broad — an
  ordered **series** plan (each episode gets a slug). Writes
  `channels/<channel>/research/<topic>.plan.json`. A series is just ordered episode
  videos in the channel, so the rest of the pipeline works per-episode unchanged.
- **Pluggable LLM, no lock-in** (`tools/lib/llm.mjs`): agent-driven by default (no
  token — Claude does it in Claude Code). For headless runs, **bring your own LLM**
  via any OpenAI-compatible endpoint — OpenAI/OpenRouter/Groq/Together/Azure and
  **local/free Ollama, LM Studio, vLLM** — by setting `RESEARCH_LLM_BASE_URL` +
  `RESEARCH_LLM_MODEL` (+ key if needed). With no LLM configured, the command
  prints the exact prompt to run.
- Research helpers (`tools/lib/research.mjs`) are pure and tested, including
  `briefToScript` which renders a research brief into a `script.md` that flows
  straight into `npm run draft`.

Next increment: the brief step (deep-research a chosen angle into facts + sources
→ `script.md`).

## [0.6.0] — 2026-06-30

Copyright-safe asset sourcing — gather real photos (and credit your own /
AI-generated media) without the licensing headache.

### Added
- **`npm run assets -- <channel> <slug> "<query>"`** searches Openverse (keyless,
  CC + public-domain), keeps only **license-safe** results, downloads them into
  `public/assets/<channel>/<slug>/`, and writes provenance + a ready-to-paste
  attribution block to `credits.json`. It prints a `[VISUAL: image …]` line to drop
  straight into your script.
- **Conservative license policy** (`tools/lib/licensing.mjs`): non-commercial
  (NC), no-derivatives (ND), and unknown licenses are blocked; CC0/public-domain
  need no attribution; CC BY/BY-SA are allowed with attribution captured. Your own
  / AI-generated media is `own` (you hold the rights).
- **`--own`** registers an AI-generated/your-own file (e.g. from ComfyUI) into
  `credits.json`, so all media — fetched or generated — is tracked in one place.
- The `image`/`video` scene `caption` is where the attribution shows on-screen.

Not legal advice — this reduces risk and records provenance; confirm before
publishing, and never add unlicensed music.

## [0.5.0] — 2026-06-30

Images and video — the engine can now show photos and b-roll, not just
code-drawn scenes. This unblocks public-domain/licensed media, AI-generated
visuals, and your own clips.

### Added
- **`image` scene** — a full-frame photo with a slow Ken Burns push-in and
  `cover`/`contain` fit. Use for public-domain/licensed photos, AI-generated
  stills, or your own images.
- **`video` scene** — full-frame b-roll via `<OffthreadVideo>`, muted by default
  (your voiceover stays the audio).
- Both take an optional **caption that doubles as an attribution label** (e.g.
  "Photo — NASA / public domain") shown in the corner.
- **Bring your own media:** an `image`/`video` `src` is a path under
  `public/assets/<channel>/<slug>/` or an `https://` URL. Drop files in and
  reference them.
- Auto-draft understands `image` / `video` sections:
  `[VISUAL: image — "assets/…/x.jpg" | "Photo — NASA"]`.

### Changed
- The section-rendering switch in `ExplainerVideo` is now exhaustive over all
  five scene kinds.

## [0.4.0] — 2026-06-30

Auto-draft — the voice now drives the timeline automatically. This completes the
core pipeline: script → record → transcribe → auto-draft → polish → render.

### Added
- **`npm run draft -- <channel> <slug>`** turns a `script.md` + `captions.json`
  into a `props.json`. Each `## Label (kind)` becomes a scene and its `[VISUAL]`
  note becomes the on-screen content (`title — "Main" | "Sub"`,
  `text — "Heading" | "Body"`, `bars — "Heading"; Label=Value, …`). The key
  part: each section's **duration is derived from the voice** by aligning its
  narration to the caption words (tolerant of number-word vs numeral
  differences). Total length comes from the voiceover.
- It prints a report and flags low-confidence sections so you know what to
  polish. The logic is a pure, testable module (`tools/lib/autodraft.mjs`) the
  future web app can reuse.

### Changed
- The example script's `[VISUAL]` notes use the new structured format, and the
  example `props.json` is now produced by auto-draft (durations aligned to the
  scratch voiceover).

## [0.3.0] — 2026-06-30

Whisper transcription — your voice can now drive the timeline.

### Added
- **`npm run transcribe -- <channel> <slug> [model]`** turns a recorded
  voiceover (`public/assets/<channel>/<slug>/vo.wav|mp3|m4a`) into word-level
  `captions.json`. It resamples to 16kHz with Remotion's bundled ffmpeg (no
  system ffmpeg needed) and installs whisper.cpp + the model on first run
  (cached to a gitignored `whisper.cpp/`). Sub-word tokens (`$`, `1`, `,`,
  `000`) are merged into whole words so captions read naturally. Default model
  `medium.en`; pass `base.en` for a faster, lighter run.
- The transcription logic lives in `tools/lib/transcribe.mjs` as an importable
  module, so the future web app and other tooling can reuse it.
- The bundled `example-explainers/compound-interest` video now ships with a real
  `captions.json` and a `voiceoverSrc`, so its duration follows the narration.

### Fixed
- `npm run render` / `npm run studio` now actually launch on Windows. The
  wrappers spawned `npx.cmd` in a way Node 18+ refuses for `.cmd` files; they
  now go through a shared, quoting-aware runner (`tools/_run.mjs`).

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
