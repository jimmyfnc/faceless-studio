# faceless-studio — Explainer Video Workflow

Code-driven explainer videos with [Remotion](https://www.remotion.dev/). Your
recorded voice drives the timeline; visuals (charts, diagrams, b-roll) are
synced to your narration. Pipeline is **hybrid**: one pass auto-drafts a video,
then you polish it in Remotion Studio before rendering.

## Pipeline

```
idea → script (scripts/<slug>.md)
     → record VO  → public/assets/<slug>/vo.wav      (your voice)
     → transcribe (Whisper) → word-level captions JSON
     → auto-draft: sections → scenes, captions synced, charts/visuals placed
     → POLISH in Remotion Studio (swap real charts/data, add b-roll, tune timing)
     → render → out/<slug>.mp4
     → publish (rclone backup → YouTube; thumbnail via Nano Banana)
```

## Commands

```bash
npm run dev                                   # Remotion Studio at http://localhost:3000
npx remotion render ExplainerVideo out/demo.mp4
npx remotion still ExplainerVideo out/frame.png --frame=60   # quick single-frame check

# Generate visuals from your ComfyUI (must be running):
node tools/comfyui-generate.mjs \
  --workflow workflows/txt2img.json \
  --out public/assets/<slug> \
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

1. Write/approve the script — `scripts/<slug>.md` (see `sample-topic.md`).
2. *Optional but recommended:* ask the ElevenLabs MCP for a **scratch** TTS
   read, build & time the whole video against it, review, **then** record your
   real voice to the locked script and swap the `.wav`. Fast iteration +
   authentic final track.
3. Record → `public/assets/<slug>/vo.wav`.
4. Transcribe with Whisper → captions JSON (`{ text, startMs, endMs }[]`).
5. Set `voiceoverSrc` + `captions` on the composition props.

### Whisper transcription (next piece to wire)

The Remotion skill's `subtitles.md` rule covers `@remotion/install-whisper-cpp`
for word-level timestamps. Output maps directly onto `CaptionTrack` and onto
each section's duration so visuals lock to your narration.

## ComfyUI visuals

Your ComfyUI lives at `D:\GitHub\ComfyUI`.

1. Start ComfyUI (default `http://127.0.0.1:8188`).
2. Build a workflow, then **gear → Save (API Format)** into `./workflows/`.
3. Run `tools/comfyui-generate.mjs` (see Commands). Images land in
   `public/assets/<slug>/`.
4. Reference them: `<Img src={staticFile("assets/<slug>/file.png")} />`.

Other generators available in your setup: the `gemini-imagegen` / `nano-banana-2`
skills for quick stills, and the Blender MCP for 3D scenes.

## Make each video a reusable template

The composition carries a **Zod schema** (`explainerSchema`), so every new video
is just new props — same code, new script + data. Copy `src/data/sample-explainer.ts`
per video, or load props from a JSON file. The Studio sidebar edits these props
visually.

## Rendering & Shorts

- `npx remotion render ExplainerVideo out/<slug>.mp4` (uses Remotion's bundled
  ffmpeg — no system ffmpeg needed for render).
- **Vertical Shorts:** add a second `<Composition>` reusing `ExplainerVideo`
  with `width={1080} height={1920}`, or override dimensions in `calculateMetadata`.

## Structure

```
src/
  Root.tsx                      # registers the ExplainerVideo composition
  compositions/ExplainerVideo.tsx   # Zod schema + calculateMetadata + scene sequencing
  scenes/  TitleCard | BarChartScene | TextScene | CaptionTrack
  theme/tokens.ts               # brand colors/fonts — change once, re-skins everything
  lib/captions.ts               # Whisper caption types
  data/sample-explainer.ts      # sample props (replace per video)
scripts/                        # spoken-language scripts, one section per scene
workflows/                      # exported ComfyUI API-format workflows
tools/comfyui-generate.mjs      # run a ComfyUI workflow → save images to public/
public/assets/<slug>/           # voiceover + generated visuals
```
