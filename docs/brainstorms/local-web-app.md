# Brainstorm: a local web app for non-developers

**Goal:** a web app a creator can run **locally** to take a video from idea →
script → voiceover → draft → preview → rendered MP4, **without a terminal or code
editor**. The `src/` engine and the `channels/` file layout stay exactly as they
are; the app is a management + orchestration layer on top.

## What already exists vs. what the app adds

Remotion **Studio** (`npm run dev`) is already a local web app for *polishing one
video*: live preview, a props form generated from the Zod schema, timeline
scrubbing, a render button. The app is **not** a replacement for that — it adds
the things Studio can't:

1. **A project library** — browse/create channels and videos (Studio only shows
   compositions registered in code).
2. **Pipeline orchestration** — record/upload a VO, transcribe, auto-draft,
   render — as buttons with progress, not CLI commands.
3. **No code editor / terminal** — edit brand + script in forms; never open a file.

"Open in Remotion Studio" stays as the deep-polish escape hatch.

## Why it must be a server + frontend (not a static page)

The browser cannot do the heavy work; these require Node:

| Capability | Needs | Package |
|---|---|---|
| Render MP4 | headless Chrome + ffmpeg | `@remotion/renderer` (`renderMedia`) |
| Transcribe VO | whisper.cpp child process | `@remotion/install-whisper-cpp` (Stage 2) |
| Read/write `channels/**` | filesystem | Node `fs` |
| Resample recorded VO → 16kHz WAV | ffmpeg | bundled with Remotion |

So the app = **local Node backend** (file APIs + job triggers + progress stream)
+ **React frontend**. The frontend previews with `@remotion/player`, which runs
the engine's React components directly — no server needed for preview.

## Stack & repo layout (recommended)

- **Next.js (App Router)** — React frontend + route handlers for the backend in
  one project; runs locally with `next dev`; hostable later. Tailwind v4 is
  already in the repo. (Alternative considered: Vite + Express — simpler, but two
  servers and less batteries; Next wins for a "full app".)
- **Lives in a new top-level `app/`** as an **npm workspace**, so Next's deps
  don't collide with the Remotion CLI deps at the root. The app imports the
  engine's composition (`ExplainerVideo`, `explainerSchema`) for the Player.
- **Engine stays independent.** The hook bumps the version only on `src/` changes;
  `app/**` changes don't. The app carries its **own** version/changelog section.

### Hosting note (future, not now)

`renderMedia` needs long-running Chrome — fine on a local Node server, **not** on
Vercel-style serverless. If this is ever hosted multi-user, rendering must move to
a queue / **Remotion Lambda**, plus auth. Out of scope for "local for now"; the
local design shouldn't block it.

## A design constraint for Stages 2 & 3

Build the **transcribe** (Stage 2) and **auto-draft** (Stage 3) steps as
importable **modules** (`tools/lib/*.mjs`) with thin CLI wrappers — so both the
terminal *and* the app server can call them and stream progress. This slightly
reshapes those stages (library-first) and is the main reason to settle the app
plan now.

## The non-dev flow (the spec the app implements)

```
Channels ──► create/edit channel (visual brand editor: color pickers + font)
   └─► Videos ──► create video (slug + title)
        └─► Script editor (guided "## Heading (kind)" sections + [VISUAL] notes)
        └─► Voice: record in-browser (MediaRecorder) OR upload  → server resamples
        └─► [Transcribe]  → captions.json           (progress)
        └─► [Auto-draft]  → props.json              (progress)
        └─► Visual editor: @remotion/player preview + props form
                           (edit section data, timing, captions, brand)
        └─► [Render]      → out/<channel>-<slug>.mp4 → download   (progress)
        └─► (later) thumbnail + publish
```

All reads/writes target the existing files (`channels/<id>/brand.json`,
`videos/<slug>/{script.md,props.json,captions.json}`, `public/assets/...`), so the
CLI and the app stay perfectly interchangeable on the same project.

## Phasing (each phase is independently useful)

| Phase | Delivers | Depends on | Notes |
|---|---|---|---|
| **1 — Shell + manage + preview + render** | channel/video library, brand editor, script editor, `@remotion/player` preview, server render + download | — | Works with **today's** engine; no Whisper/draft needed. A no-terminal app for the manual flow. App `0.1.0`. |
| **2 — Voice** | in-browser record/upload, server resample, transcribe button | Whisper (Stage 2) as a module | Folds the pipeline's Stage 2 into the app. |
| **3 — Auto-draft** | script → props button | Auto-draft (Stage 3) as a module | Folds in Stage 3. |
| **4 — Assets & publish** | ComfyUI trigger, thumbnail (Nano Banana), publish (rclone/YouTube), UX polish | — | The "studio for creators" finish. |

This **reorders** the roadmap: rather than building Stage 2/3 as CLI tools and a
UI separately, we build the app shell (Phase 1) now and fold Stage 2/3 into it as
callable modules. The voice pipeline still ships; it just lands behind buttons.

## Phase 1 scope (the first build)

- `app/` Next.js workspace; import `ExplainerVideo` + `explainerSchema` from the engine.
- **Backend route handlers:** list/create channels & videos; read/write
  `brand.json`, `props.json`, `script.md`; trigger `renderMedia` with merged
  brand+props and stream progress; serve the finished MP4.
- **Frontend:** channels/videos library; brand editor (color pickers + font
  fields, validated by `brandSchema`); script editor (textarea with section
  helper); `@remotion/player` preview fed merged brand+props; props form for
  section data/timing; Render button with progress + download; "Open in Studio".
- **Acceptance:** from a clean app, create a channel, add a video, edit brand +
  props, preview live, render, and download the MP4 — never touching a terminal
  or `src/`.

## Open decisions

1. **Stack confirm** — Next.js + `app/` workspace (recommended) vs Vite + Express.
2. **Workspace vs single package** — npm workspaces (recommended) keeps Next and
   Remotion-CLI deps from colliding.
3. **App name** — placeholder; pick before scaffolding.
4. **Multi-user hosting** — explicitly deferred; local-first now (see hosting note).

## Out of scope (for the local app)

Hosted multi-tenant, accounts/auth, billing, a render queue/Lambda, collaborative
editing. Local-first; the architecture leaves the door open but doesn't build them.
