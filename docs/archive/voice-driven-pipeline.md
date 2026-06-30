# Brainstorm: the voice-driven, multi-channel pipeline

> **Shipped** across `0.2.0`–`0.4.0` (Stage 1 multi-channel foundation, Stage 2
> Whisper transcription, Stage 3 auto-draft). Archived for reference.

**Two goals, one plan:**

1. **Reusable, not personal** — anyone who pulls the repo gets a code-driven
   *engine*, not the creator's AI-explainer channel. Different people make
   different videos on different subjects without editing `src/` or inheriting
   someone else's brand.
2. **Voice drives the timeline** — a recorded `vo.wav` + a written script become a
   drafted, voice-timed video automatically.

These share one foundation: separating the shared **engine** from per-creator
**brand** and per-video **content**. Build the foundation first (Stage 1), then
the voice pipeline on top (Stages 2–3). Each stage ships as its own version.

```
channels/<id>/brand.json ──────────────┐
channels/<id>/videos/<slug>/script.md ──┤  tools/auto-draft  ─►  props.json ─┐
public/assets/<id>/<slug>/vo.wav ─► tools/transcribe ─► captions.json ───────┤
                                                                merge brand+props ─► render
```

---

## The three layers (the whole idea)

| Layer | Lives in | Versioned? | Who owns it |
|---|---|---|---|
| **Engine** | `src/` | yes — semver `x.y.z` | the project (shared by everyone) |
| **Brand** | `channels/<id>/brand.json` | no (content) | each creator |
| **Content** | `channels/<id>/videos/<slug>/` + `public/assets/<id>/<slug>/` | no (content) | each creator |

The rule: **making a video — or re-skinning a channel — must never touch `src/`
or bump the engine version.** That is what keeps a puller from being forced into
the original creator's subject or look.

---

## Why this order

| # | Stage | Ships | Depends on | Why here |
|---|---|---|---|---|
| 1 | **Multi-channel foundation** (content + brand-as-data) | `0.2.0` | — | Defines *where* brand and content live and pulls the hardcoded theme out of `src/`. Everything else writes into this structure. |
| 2 | **Whisper transcription** | `0.3.0` | stage 1 | Produces the word timings (`captions.json`) the draft step consumes. |
| 3 | **Script → auto-draft** | `0.4.0` | 1 + 2 | Aligns script to captions, emits `props.json`. The "auto-draft" pass. |

Quick wins (Shorts variant, brand font) are independent and slot in anywhere.

---

## Data contracts (pin before any code)

### Directory layout — channel-scoped

```
src/                                  # ENGINE — shared, versioned, never edited to make a video
  theme/tokens.ts                     #   → defaultBrand + brandSchema (fallback only)

channels/                             # creators' spaces — NOT the engine
  example-explainers/                 #   the one example shipped with the repo (a neutral starter)
    brand.json                        #     colors + fonts for this channel
    videos/
      compound-interest/
        props.json                    #     a video = data; validates against explainerSchema
        script.md                     #     the written script (moves here from scripts/)
  <your-channel>/                     #   a real channel (see "Keeping content private")

public/assets/<id>/<slug>/            # media (vo.wav, images) — must live under public/ for staticFile()
```

`channels/` is **new** and outside `src/`. The legacy `scripts/<slug>.md` moves
under its channel; `src/data/sample-explainer.ts` stays only as the engine's
no-content default.

### `brand.json` — IS a `brandSchema`

`src/theme/tokens.ts` becomes two exports: a Zod `brandSchema` and a
`defaultBrand` (today's values). A channel's `brand.json` validates against
`brandSchema` and overrides the default:

```jsonc
{
  "colors": {
    "bg": "#0B0F1A", "bgAlt": "#121826", "text": "#F8FAFC", "textMuted": "#94A3B8",
    "accent": "#38BDF8", "accent2": "#A78BFA", "grid": "#1E293B",
    "barColors": ["#38BDF8", "#A78BFA", "#34D399", "#FBBF24", "#FB7185"]
  },
  "fonts": { "heading": "Inter, system-ui, sans-serif", "body": "Inter, system-ui, sans-serif" }
}
```

**Engine change:** scenes currently `import { theme }` directly. They switch to a
`useBrand()` hook fed by a `<BrandProvider>` that `ExplainerVideo` seeds from
props. `defaultBrand` is the fallback when no brand is supplied. The standalone
`accentColor` prop folds into `brand.colors.accent` (a clean breaking change,
fine at pre-launch `0.x`).

### `props.json` — IS a serialized `ExplainerProps`

No new schema: `props.json` validates against the existing `explainerSchema`
(sections + captions + `voiceoverSrc`). Brand is **not** duplicated into every
video — it's merged in at render time (below).

### `captions.json` — IS the engine's `CaptionsJson`

`src/lib/captions.ts` already defines `CaptionsJson = { words: CaptionWord[] }`,
`CaptionWord = { text, startMs, endMs }`. Whisper's `toCaptions()` returns
exactly that. Stage 2 writes it, Stage 3 reads it. No new type.

### Render / preview — a thin wrapper merges brand + props

`--props` takes one JSON object, and on Windows shells inline JSON is unsupported
(the shell strips `"`), so we always pass a **file**. A small Node wrapper reads
`brand.json` + `props.json`, merges them, writes a temp file, and invokes
Remotion:

```bash
npm run render -- <channel> <slug>        # tools/render.mjs → remotion render --props=<merged tmp>
npm run studio -- <channel> <slug>        # tools/studio.mjs → remotion studio --props=<merged tmp>
npm run dev                               # engine default (sample-explainer), unchanged
```

The wrapper runs in Node (full fs access), so reading both files and merging
`{ ...props, brand }` is trivial — no need to put `props.json` under `public/`.

### Keeping content private

Default `.gitignore`: track `channels/example-*/` only, ignore other
`channels/*`. So the shared engine never ships a real creator's videos, and a
public copy is automatically generic.

> Decision for the owner: while this repo is private you can keep your own
> channel tracked here for backup; before making the engine public (or a
> template), move your channel to a separate private content repo or rely on the
> gitignore. Flagged, not forced.

---

## Stage 1 — Multi-channel foundation  → `0.2.0`

**Outcome:** a video renders from `channels/<id>/videos/<slug>/props.json` with a
per-channel `brand.json`, and zero edits to `src/` are needed to make a new
channel or video.

- **Brand-as-data (engine):** split `tokens.ts` into `brandSchema` + `defaultBrand`;
  add `<BrandProvider>` + `useBrand()`; convert all four scenes to read brand
  from the hook; fold `accentColor` into `brand.colors.accent`.
- **Channel structure:** create `channels/example-explainers/` with `brand.json`
  and `videos/compound-interest/{props.json,script.md}` (the current sample,
  serialized). Move `scripts/sample-topic.md` in as `script.md`.
- **Render ergonomics:** `tools/render.mjs` + `tools/studio.mjs` + npm scripts.
- **Duration from VO:** make `calculateExplainerMetadata` async; when
  `voiceoverSrc` is set, derive total duration via `parseMedia()` (authoritative,
  matches the VO); else sum sections (today's behavior — keeps the sample working).
- **`.gitignore`:** the `channels/*` rule above.
- **Onboarding docs (front door for new creators):**
  - Rewrite `README.md` — it's currently default Remotion boilerplate. New content:
    what the project is, the engine/brand/content three-layer model, a quick start,
    and **"make your own channel"** in ~5 steps.
  - A **setup / prerequisites** section covering everything that must be hooked up
    to work: Node + `npm i`; `./scripts/install-hooks.sh` (once per clone);
    **ComfyUI** (optional — local image gen, host/port, `tools/comfyui-generate.mjs`);
    **ElevenLabs** key (optional — scratch TTS via MCP, `setx ELEVENLABS_API_KEY`);
    Whisper (auto-installs in Stage 2); and which pieces are required vs optional.
  - Update WORKFLOW.md (new channel commands + layout) and CLAUDE.md (the
    three-layer rule). Keep the deep pipeline in WORKFLOW.md; keep README skimmable.

**Risk / decision:** if VO-derived total ≠ sum of sections, the last
`<Series.Sequence>` clips or gaps. Decision: total from `parseMedia` is
authoritative; pad/trim the final section. (Stage 3 makes sections sum to the VO
naturally, so it's mostly a guard.)

**Acceptance:** `npm run render -- example-explainers compound-interest` produces
a video; changing `brand.json` re-skins it with no `src/` edit; `npm run lint` clean.

**Add dep:** `@remotion/media-parser` (pinned `4.0.482`).

---

## Stage 2 — Whisper transcription  → `0.3.0`

**Outcome:** `tools/transcribe.mjs <channel> <slug>` turns `vo.wav` into
`channels/<id>/videos/<slug>/captions.json`.

Grounded API (`@remotion/install-whisper-cpp`, Remotion 4.0.x):

```js
import { installWhisperCpp, downloadWhisperModel, transcribe, toCaptions } from "@remotion/install-whisper-cpp";

await installWhisperCpp({ to, version: "1.5.5" });
await downloadWhisperModel({ model: "medium.en", folder: to });
const { transcription } = await transcribe({
  inputPath, whisperPath: to, whisperCppVersion: "1.5.5",
  model: "medium.en", tokenLevelTimestamps: true,   // --dtw, accurate word timings
});
const { captions } = toCaptions({ whisperCppOutput: transcription });
// write { words: captions.map(({text,startMs,endMs}) => ({text,startMs,endMs})) }
```

- **16kHz requirement:** `transcribe` needs a 16-bit/16kHz WAV; add a resample
  pre-step (ffmpeg) to a temp file, never mutating the original `vo.wav`.
- **Model:** default `medium.en`; `--model base.en` for speed. whisper.cpp +
  model install once, cached to a gitignored `whisper.cpp/` folder.
- **Wiring:** `npm run transcribe -- <channel> <slug>`.

**Risk:** first-run install is large/platform-specific. Mitigation: idempotent +
cached install, `onProgress` logging.

**Acceptance:** transcribing the example VO writes a `captions.json` whose words
visibly track the audio in `CaptionTrack`.

**Decision:** keep the local `CaptionWord` subset type (tools-only stage) rather
than adopting `@remotion/captions`' richer `Caption` (which would touch `src/`).

---

## Stage 3 — Script → auto-draft  → `0.4.0`

**Outcome:** `tools/auto-draft.mjs <channel> <slug>` reads `script.md` +
`captions.json` and emits `props.json`.

**Parse the script** (`script.md`): each `## Heading (kind)` → a section
(`kind` from the parenthetical: `title` | `bars` | `text`); body text = spoken
words; `[VISUAL: ...]` → scene specifics.

**The hard part — align sections to the transcript** so durations derive from the
voice:
1. Normalize both streams (lowercase, strip punctuation, expand cheap number-words).
2. Walk a monotonic pointer through caption words, consuming each section's words
   in order. `start = firstWord.startMs`, `end = lastWord.endMs`.
3. Make sections contiguous (`section[i].end = section[i+1].start`) so scenes tile
   the whole VO.
4. `durationInFrames = round((end - start) / 1000 * fps)`.

**Fallback (required):** if a section's alignment confidence is low (transcript
drifted — disfluencies, "8%" vs "eight percent"), fall back to a proportional
split by word count and **print a report flagging that section** for manual
polish. Never silently emit bad timings.

**Bar data:** parse numbers from `[VISUAL: bar chart — 1000 / 1469 / ...]` for a
first draft; placeholder + flag when unparseable.

**Acceptance:** auto-drafting the example yields a `props.json` that renders
end-to-end with section cuts landing on narration boundaries (±~0.3s).

---

## Open decisions (resolve while building)

1. **Where the owner's real channel is version-controlled** — tracked here while
   private vs separate private content repo (see "Keeping content private").
2. **Number-word normalization depth** in Stage 3 — start shallow, deepen only if
   real scripts demand it.

## Out of scope (tracked separately on the roadmap)

End-to-end auto mode, YouTube upload + thumbnail, the template-library, Shorts
variant, brand font, and turning the repo into a GitHub *template repository* for
public sharing (near-zero effort when the time comes, given this foundation).
