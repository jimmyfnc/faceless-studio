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

# Generate the video's images from its images.json (ComfyUI must be running):
npm run generate -- <channel> <slug> [--candidates N] [--only s03a,s05b | --flagged]
npm run qc -- <channel> <slug>                    # hallucination check → qc-report.json
npm run pick -- <channel> <slug> s03a=1 s05b=3    # promote candidate winners
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

## Research → script (front of the funnel)

Start from an idea. Three positional sub-commands (positional so npm forwards them
reliably):

```bash
# 1. PLAN: narrow a topic to one video or a series
npm run research -- plan <channel> "<topic>" [--angles 5] [--episodes 6]
npm run research -- plan example-explainers "the history of money"

# 2. BRIEF: research a chosen angle (search + LLM, or agent-guided)
npm run research -- brief <channel> <slug> "<angle>"

# 3. SCRIPT: format a brief.json (from the agent or any LLM) → research.json + script.md
npm run research -- script <channel> <slug> brief.json
```

**Plan** writes `channels/<channel>/research/<topic>.plan.json`: a `single`-vs-`series`
assessment, sharp single-video **angles**, and — if broad — an ordered **series**
plan (each episode gets a slug like `the-history-of-money-02-the-first-coins`).
Pick an angle → make one video; pick the series → make each episode a normal
`videos/<slug>/`. **Brief**/**script** write `videos/<slug>/{research.json, script.md}` —
a sourced draft script that flows into `transcribe` → `draft`.

### Bring your own LLM + search (no lock-in)

- **Agent-driven (default, no token):** in Claude Code, Claude plans, searches, and
  drafts. With nothing configured, each command prints the exact prompt to run.
- **Bring your own LLM (headless):** any OpenAI-compatible endpoint — OpenAI,
  OpenRouter, Groq, Together, Azure, and **local/free Ollama, LM Studio, vLLM**.
- **Bring your own search (headless):** Brave or Tavily.

```bash
# LLM — OpenAI (or compatible)
setx RESEARCH_LLM api
setx RESEARCH_LLM_API_KEY "sk-..."                  # default model gpt-4o-mini
# LLM — local Ollama (free, no key)
setx RESEARCH_LLM_BASE_URL "http://localhost:11434/v1"
setx RESEARCH_LLM_MODEL "llama3.1"
# Search (for headless brief)
setx RESEARCH_SEARCH brave
setx RESEARCH_SEARCH_API_KEY "..."                  # or RESEARCH_SEARCH=tavily
```

No one is forced onto Claude or a paid token; a free local model works.

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

### Auto-draft

```bash
npm run draft -- <channel> <slug>
npm run draft -- example-explainers compound-interest
```

Reads `script.md` + `captions.json` and writes `props.json`: each
`## Label (kind)` becomes a scene, its `[VISUAL]` note becomes the scene content,
and — the key part — each section's **duration is derived from the voice** by
aligning its narration to the caption words. Total length comes from the VO. It
prints a report and flags any section whose narration didn't align well, so you
know what to check. **It overwrites `props.json`** — then polish the draft in
Studio:

Scene kinds and their `[VISUAL]` formats:

| kind | `[VISUAL]` | renders |
|---|---|---|
| `title` | `title — "Main" \| "Subtitle"` | animated title card |
| `text` | `text — "Heading" \| "Body"` | heading + supporting line |
| `bars` | `bars — "Heading"; Label=Value, …` | animated bar chart |
| `image` | `image — "assets/<ch>/<slug>/x.jpg" \| "Photo — NASA"` | full-frame photo, Ken Burns, corner caption |
| `video` | `video — "assets/<ch>/<slug>/clip.mp4" \| "B-roll — Pexels"` | full-frame b-roll (muted) |

The `image`/`video` caption doubles as an **attribution label** — put the source
+ license there.

**Bring your own media:** drop images/clips into
`public/assets/<channel>/<slug>/` and reference them by their `assets/…` path
(heavy `*.mp4/.wav` are gitignored; `*.png/.jpg` are committed). An `image`/`video`
`src` may also be an `https://` URL. Generate visuals with ComfyUI (below) or the
`gemini-imagegen` / `nano-banana-2` skills, fetch public-domain/licensed media
(next), or shoot your own — all land in the same folder.

### Sourcing copyright-safe assets

```bash
# Search Openverse (CC + public-domain), license-filter, download, and credit:
npm run assets -- <channel> <slug> "<query>" [count]
npm run assets -- example-explainers compound-interest "stock market" 4

# Credit your own / AI-generated (e.g. ComfyUI) file already in the folder:
npm run assets -- <channel> <slug> --own diagram.png --source "ComfyUI" --title "Compounding"
```

Only **license-safe** results are kept — non-commercial (NC), no-derivatives (ND),
and unknown licenses are dropped automatically (the policy lives in
`tools/lib/licensing.mjs`, conservative by default). Provenance + a ready-to-paste
attribution block are written to `channels/<channel>/videos/<slug>/credits.json`;
put the printed attribution into the `image`/`video` caption and the video
description. **Safest of all is AI-generated or your own media** (`--own`) — you
hold the rights. *Not legal advice — it reduces risk and records provenance; you
confirm before publishing. Never add unlicensed music.*

```bash
npm run studio -- <channel> <slug>
npm run render -- <channel> <slug>
```

## Generated images (images.json → generate → qc → pick)

A video's generated images are **content**, declared in
`channels/<channel>/videos/<slug>/images.json` next to the script:

```json
{
  "defaults": { "workflow": "flux-schnell", "negative": "text, watermark, extra fingers" },
  "images": [
    { "name": "s01a", "label": "Hook", "prompt": "a friendly clay robot waving hello" },
    { "name": "s05b", "label": "Checks", "prompt": "...", "workflow": "qwen-image" }
  ]
}
```

- **Names drive the montage:** auto-draft turns `s01*.png` into section 1's
  montage images, `s02*.png` into section 2's, etc. (candidate files like
  `s01a-2.png` are ignored until picked).
- **Per-image model routing:** an entry's `workflow` overrides the default.
  Rule of thumb: `qwen-image` (Apache, real CFG — negative prompts work, strong
  anatomy, ~50s/image) for character/hand shots; `flux-schnell` (Apache,
  4-step, ~5s/image) for everything else. The channel's `style.json`
  `imageStyle` is appended to every prompt.

The loop (ComfyUI must be running; start it, generate, then stop it to free VRAM):

```bash
npm run generate -- <channel> <slug>                 # all entries → public/assets/<ch>/<slug>/
npm run qc -- <channel> <slug>                       # vision QC → qc-report.json (fails on flags)
# reword flagged prompts in images.json, then:
npm run generate -- <channel> <slug> --flagged --candidates 3
npm run pick -- <channel> <slug> s03a=1 s05b=3       # promote winners, clean candidates + credits
npm run qc -- <channel> <slug>                       # confirm clean
```

`generate --only s03a,s05b` regenerates specific entries. Every image is
registered in `credits.json` as your own (license `own`) with the model that
made it. QC checks for baked text, anatomy errors (extra/fused hands), garbled
shapes, and off-brand style — agent-driven by default, or bring your own vision
endpoint (`QC_VISION_BASE_URL` + `QC_VISION_MODEL`; a local Ollama llava works).

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

- **Long-form:** `npm run render -- <channel> <slug>` (uses Remotion's bundled
  ffmpeg — no system ffmpeg needed). Duration matches the voiceover when one is set.
- **Vertical short cut:** `npm run short -- <channel> <slug> [seconds]` (default
  `30`). Trims the long-form to a leading window (the hook/teaser), keeps the VO +
  captions for that window, and renders the `ExplainerShort` composition
  (1080×1920) → `out/<channel>-<slug>-short.mp4`. One source → long-form + Shorts /
  Reels / TikTok. (`seconds` is positional — npm doesn't forward `--flags`.)

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
