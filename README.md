# faceless-studio

Code-driven **faceless explainer videos** with [Remotion](https://www.remotion.dev/).
Your recorded voice drives the timeline; charts, diagrams, and b-roll sync to the
narration. One pass auto-drafts a video, then you polish it in Remotion Studio
before rendering.

It's built to be **reused**: the `src/` engine is shared, but each creator's
**brand** and **content** live outside it — so you can run your own channel (any
subject, any look) without editing the engine.

## The three layers

| Layer | Lives in | You edit it to… |
|---|---|---|
| **Engine** | `src/` | change the product for *everyone* (bumps the version) |
| **Brand** | `channels/<id>/brand.json` | re-skin *your* channel (colors + fonts) |
| **Content** | `channels/<id>/videos/<slug>/` + `public/assets/<id>/<slug>/` | make a video (script, props, voiceover, visuals) |

**Making a video — or re-skinning your channel — never touches `src/`.** That's
what keeps you from being forced into anyone else's subject or style.

## Quick start

```bash
npm install                 # install dependencies
./scripts/install-hooks.sh  # once per clone — installs the release hygiene hook

npm run dev                 # Remotion Studio on the engine's built-in sample
# Render the bundled example channel:
npm run render -- example-explainers compound-interest   # → out/example-explainers-compound-interest.mp4
npm run studio -- example-explainers compound-interest   # polish that video in Studio
```

> On Windows, always make videos through `npm run render`/`npm run studio` (they
> pass a props **file** to Remotion). Inline `--props='{...}'` JSON is stripped by
> Windows shells and won't work.

## Make your own channel

1. `mkdir -p channels/<your-channel>/videos/<slug>` and
   `public/assets/<your-channel>/<slug>`.
2. Copy `channels/example-explainers/brand.json` and set your colors + fonts.
3. Write `channels/<your-channel>/videos/<slug>/script.md` (one `## Heading (kind)`
   per scene — see the example).
4. Add `channels/<your-channel>/videos/<slug>/props.json` (validates against the
   engine's `explainerSchema`; copy the example's to start).
5. `npm run studio -- <your-channel> <slug>` to preview, then
   `npm run render -- <your-channel> <slug>`.

New channels are git-ignored by default (only `example-explainers` ships in this
repo), so your content stays yours. See [WORKFLOW.md](WORKFLOW.md) for the full
record-voice → transcribe → auto-draft → polish → render pipeline.

## Setup / prerequisites

| Tool | Required? | What it's for | Setup |
|---|---|---|---|
| **Node.js** (18+) | yes | runs Remotion + the tooling | `npm install` |
| **Pre-commit hook** | recommended | enforces version bump + changelog + docs coupling | `./scripts/install-hooks.sh` (once per clone) |
| **Chrome / headless shell** | yes (renders) | Remotion downloads it automatically on first render | none |
| **ElevenLabs API key** | optional | scratch TTS / SFX / Scribe STT via the project MCP | `setx ELEVENLABS_API_KEY "sk-..."`, then restart the editor |
| **ComfyUI** | optional | local image generation for b-roll/diagrams | see [WORKFLOW.md](WORKFLOW.md#comfyui-visuals) |
| **Whisper** | optional (Stage 2) | word-level transcription of your voiceover | auto-installs when the transcribe step lands |

Only Node + a browser are required to render. ElevenLabs, ComfyUI, and Whisper
are opt-in pieces of the production pipeline.

## Commands

```bash
npm run dev                                # Studio on the engine sample
npm run studio -- <channel> <slug>         # Studio on a specific channel video
npm run render -- <channel> <slug> [out]   # render a channel video to out/
npm run transcribe -- <channel> <slug>     # voiceover → captions.json (Whisper)
npm run lint                               # eslint + tsc
npm test                                   # vitest (schema, brand merge, captions)
npm run upgrade                            # upgrade Remotion (verify a render after)
```

## Docs

- [WORKFLOW.md](WORKFLOW.md) — the full production pipeline and per-tool setup.
- [CLAUDE.md](CLAUDE.md) — engine vs content rules, versioning, release checklist.
- [docs/ROADMAP.md](docs/ROADMAP.md) — what's planned, ranked by effort.
- [docs/brainstorms/](docs/brainstorms/) — design write-ups for in-flight work.

Built on Remotion 4 + React 19 + TypeScript. Remotion may require a company
license — [read the terms](https://github.com/remotion-dev/remotion/blob/main/README.md).
