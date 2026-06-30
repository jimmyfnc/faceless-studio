# faceless-studio — Explainer Video Workflow

Code-driven explainer videos with [Remotion](https://www.remotion.dev/). Your
recorded voice drives the timeline; visuals (charts, diagrams, b-roll) are
synced to your narration. Pipeline is **hybrid**: one pass auto-drafts a video,
then you polish it in Remotion Studio before rendering.

## Pipeline

Everything for one video is keyed by a `<channel>` + `<slug>`:

```
idea → script   channels/<channel>/videos/<slug>/script.md
     → record VO → public/assets/<channel>/<slug>/vo.wav        (your voice)
     → transcribe (Whisper) → channels/<channel>/videos/<slug>/captions.json
     → auto-draft: sections → scenes, captions synced → .../props.json
     → POLISH in Studio:  npm run studio -- <channel> <slug>
     → render:            npm run render -- <channel> <slug>   → out/<channel>-<slug>.mp4
     → publish (rclone backup → YouTube; thumbnail via Nano Banana)
```

The render/studio wrappers merge the channel's `brand.json` into the video's
`props.json` and hand Remotion a single props **file** (required on Windows,
where inline `--props` JSON is unsupported).

## Commands

```bash
npm run dev                                   # Studio on the engine sample (http://localhost:3000)
npm run studio -- <channel> <slug>            # Studio on a specific channel video
npm run render -- <channel> <slug> [outFile]  # render → out/<channel>-<slug>.mp4

# Engine-level (no channel): operate on the built-in sample directly.
npx remotion still ExplainerVideo out/frame.png --frame=60   # quick single-frame check

# Generate visuals from your ComfyUI (must be running):
node tools/comfyui-generate.mjs \
  --workflow workflows/txt2img.json \
  --out public/assets/<channel>/<slug> \
  --prompt "isometric diagram, clean vector, dark background" --prompt-node 6
```

## MCP servers (`.mcp.json`)

Both are scoped to **this project** (won't touch your agents repo). In Claude
Code, first use prompts you to trust them; run `/mcp` to check status.

| Server | Purpose | Setup |
|---|---|---|
| `remotion` | Live Remotion docs/API knowledge (`npx @remotion/mcp`) | none |
| `elevenlabs` | Scratch-TTS narration, sound effects, Scribe speech-to-text | needs `ELEVENLABS_API_KEY` |

The ElevenLabs key is read from your environment (`${ELEVENLABS_API_KEY}`), so
no secret is committed. Set it once, then restart the editor:

```powershell
setx ELEVENLABS_API_KEY "sk-..."
```

(`uv`/`uvx` and Python are already installed, so `uvx elevenlabs-mcp` runs as-is.)

## Remotion Studio — who uses it and how

`npm run dev` opens **Studio** in your browser. It is a *live preview* of the
React compositions plus a props editor and a render button.

- **You** use Studio for the **polish** stage: scrub the timeline, edit props
  (accent color, section data) live in the schema sidebar, watch code changes
  hot-reload, and trigger renders.
- It is **not** a drag-and-drop editor. The video *is* code in `src/`. Studio
  shows whatever that code renders. **Claude edits the code; you preview and
  fine-tune in Studio.** That division is the whole point of the hybrid flow.

## Recording your own voice

1. Write/approve the script — `channels/<channel>/videos/<slug>/script.md`
   (see the bundled `example-explainers/.../compound-interest/script.md`).
2. *Optional but recommended:* ask the ElevenLabs MCP for a **scratch** TTS
   read, build & time the whole video against it, review, **then** record your
   real voice to the locked script and swap the `.wav`. Fast iteration +
   authentic final track.
3. Record → `public/assets/<channel>/<slug>/vo.wav` (or `vo.mp3`/`vo.m4a`).
4. Transcribe with Whisper → `channels/<channel>/videos/<slug>/captions.json`.
5. Set `voiceoverSrc` + `captions` in the video's `props.json`.

### Whisper transcription

```bash
npm run transcribe -- <channel> <slug> [model]   # default model: medium.en
npm run transcribe -- example-explainers compound-interest base.en
```

Reads `public/assets/<channel>/<slug>/vo.(wav|mp3|m4a)`, resamples to 16kHz with
Remotion's bundled ffmpeg (no system ffmpeg needed), runs `@remotion/install-whisper-cpp`
(installs whisper.cpp + the model on first run, cached to a gitignored
`whisper.cpp/`), and writes word-level `captions.json` (`{ text, startMs, endMs }[]`).
Sub-word tokens (`$`, `1`, `,`, `000`) are merged into whole words.

Then drop the words into the video's `props.json` `captions` (Stage 3 auto-draft
will do this and align section durations to the words; for now copy them in).
With a `voiceoverSrc` set, the video's total duration matches the VO automatically.

## ComfyUI visuals

Your ComfyUI lives at `D:\GitHub\ComfyUI`.

1. Start ComfyUI (default `http://127.0.0.1:8188`).
2. Build a workflow, then **gear → Save (API Format)** into `./workflows/`.
3. Run `tools/comfyui-generate.mjs` (see Commands). Images land in
   `public/assets/<channel>/<slug>/`.
4. Reference them: `<Img src={staticFile("assets/<channel>/<slug>/file.png")} />`.

Other generators available in your setup: the `gemini-imagegen` / `nano-banana-2`
skills for quick stills, and the Blender MCP for 3D scenes.

## Channels, brand & content

The `src/` engine is shared; per-creator **brand** and per-video **content** live
under `channels/`:

```
channels/<channel>/
  brand.json                       # colors + fonts (validates against brandSchema)
  videos/<slug>/
    script.md                      # the spoken script, one ## section per scene
    props.json                     # the video (validates against explainerSchema)
    captions.json                  # Whisper word timings (Stage 2)
public/assets/<channel>/<slug>/    # vo.wav + generated visuals (staticFile)
```

A video is just data: `props.json` validates against the engine's
`explainerSchema`, so making one — or re-skinning a channel via `brand.json` —
never edits `src/`. The render/studio wrappers merge `brand.json` into the props
for you. Only `channels/example-explainers/` is tracked; other channels are
git-ignored (keep yours private or in a separate content repo).

## Rendering & Shorts

- `npm run render -- <channel> <slug>` (uses Remotion's bundled ffmpeg — no
  system ffmpeg needed). Duration matches the voiceover when one is set.
- **Vertical Shorts:** add a second `<Composition>` reusing `ExplainerVideo`
  with `width={1080} height={1920}`, or override dimensions in `calculateMetadata`.

## Structure

```
src/                              # THE ENGINE (shared, versioned)
  Root.tsx                        #   registers the ExplainerVideo composition
  compositions/ExplainerVideo.tsx #   Zod schema + calculateMetadata + scene sequencing
  scenes/  TitleCard | BarChartScene | TextScene | CaptionTrack
  theme/tokens.ts                 #   brandSchema + defaultBrand (fallback)
  theme/BrandProvider.tsx         #   <BrandProvider> + useBrand() — scenes read brand here
  lib/captions.ts                 #   Whisper caption types
  data/sample-explainer.ts        #   engine's no-content default (npm run dev)
channels/                         # CONTENT + BRAND (per creator; mostly git-ignored)
  example-explainers/
    brand.json                    #   channel colors + fonts
    videos/<slug>/{script.md,props.json,captions.json}
tools/
  render.mjs · studio.mjs         # merge brand+props → run Remotion (npm run render/studio)
  comfyui-generate.mjs            # run a ComfyUI workflow → save images to public/
workflows/                        # exported ComfyUI API-format workflows
public/assets/<channel>/<slug>/   # voiceover + generated visuals (staticFile)
```
