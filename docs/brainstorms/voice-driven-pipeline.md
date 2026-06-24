# Brainstorm: the voice-driven pipeline

**Goal:** make the channel's headline promise — *"your recorded voice drives the
timeline"* — literally true. Today section durations and captions are
hand-authored numbers in `src/data/sample-explainer.ts`. This plan turns a
recorded `vo.wav` + a written script into a drafted, voice-timed video without
touching the `src/` engine.

This single doc sequences the three 🟡 Pipeline roadmap items, because they form
one dependency chain and share one set of data contracts. Build them in order;
each ships as its own version.

```
scripts/<slug>.md  ──┐
                     ├─►  tools/auto-draft.mjs  ──►  videos/<slug>/props.json  ──►  render
public/assets/<slug>/vo.wav ─► tools/transcribe.mjs ─► videos/<slug>/captions.json ─┘
```

---

## Why this order

| # | Stage | Ships | Depends on | Why it must come first / here |
|---|---|---|---|---|
| 1 | **Per-video content loading** | `0.2.0` | — | Defines *where* a video's data lives (`videos/<slug>/`). The next two stages need a target to write to. Resolves the engine-vs-content tension in CLAUDE.md. |
| 2 | **Whisper transcription** | `0.3.0` | stage 1 | Produces the word timings (`captions.json`) that everything downstream consumes. |
| 3 | **Script → auto-draft** | `0.4.0` | stages 1 + 2 | Consumes script + captions, emits the `props.json` from stage 1. The actual "auto-draft" pass. |

The two 🟢 quick wins (Shorts variant, brand font) are independent and can slot
in anywhere.

---

## The data contracts (pin these before any code)

### Directory layout — one slug ties three places together

```
scripts/<slug>.md                 # the written script (tracked)
public/assets/<slug>/vo.wav       # recorded voiceover (gitignored media)
public/assets/<slug>/*.png        # generated visuals (gitignored)
videos/<slug>/captions.json       # Whisper output    (tracked — small, regenerable)
videos/<slug>/props.json          # final per-video props (tracked)
```

`videos/` is **new** and lives outside `src/`, so creating a video never bumps
the engine version. `props.json` and `captions.json` are tracked (small JSON,
the editable source of a video); the `.wav`/`.png` media stays gitignored as
today.

### `props.json` — IS a serialized `ExplainerProps`

The contract is simply: **`props.json` validates against the existing
`explainerSchema`.** No new schema to invent. Rendered via Remotion's `--props`:

```jsonc
{
  "accentColor": "#38BDF8",
  "voiceoverSrc": "assets/compound-interest/vo.wav",
  "sections": [
    { "kind": "title", "durationInFrames": 90,  "text": "How Compound Interest Works", "subtitle": "A 60-second explainer" },
    { "kind": "bars",  "durationInFrames": 150, "heading": "$1,000 at 8% / year", "data": [ { "label": "Year 0", "value": 1000 } ] },
    { "kind": "text",  "durationInFrames": 120, "heading": "Time beats timing.", "body": "Start early." }
  ],
  "captions": [ { "text": "How", "startMs": 200, "endMs": 520 } ]
}
```

### `captions.json` — IS the engine's `CaptionsJson`

`src/lib/captions.ts` already defines `CaptionsJson = { words: CaptionWord[] }`
and `CaptionWord = { text, startMs, endMs }`. Whisper's `toCaptions()` returns
exactly that shape (plus extra `timestampMs`/`confidence` we can drop). So
stage 2 writes `{ "words": [...] }` and stage 3 reads it. No new type.

### Render / preview invocation (Windows-aware)

```bash
# Render a specific video — NOTE: file path, not inline JSON.
npx remotion render ExplainerVideo --props=videos/<slug>/props.json out/<slug>.mp4

# Preview/polish that same video in Studio:
npm run dev -- --props=videos/<slug>/props.json
```

> ⚠️ Remotion docs: *inline* `--props='{...}'` JSON is **unsupported on Windows
> shells** (the shell strips `"`). A `props.json` file is mandatory here, which
> is exactly the convention above.

---

## Stage 1 — Per-video content loading  → `0.2.0`

**Outcome:** a real video renders from `videos/<slug>/props.json` with zero edits
to `src/data/`.

- **Convention + demo:** create `videos/compound-interest/props.json` (the
  current `sampleExplainer`, serialized). Prove `--props` renders it. Keep
  `sampleExplainer` in `src/data/` as the engine's no-VO default only.
- **Engine change (the part that earns the version bump):** make
  `calculateExplainerMetadata` `async`, and when `voiceoverSrc` is set, derive
  total `durationInFrames` from the audio via `parseMedia()` so the video always
  matches the VO length. Fall back to sum-of-sections when there's no VO (today's
  behavior, keeps the sample working).
- **Docs:** add the render + Studio commands above to WORKFLOW.md, with the
  Windows note.
- **`.gitignore`/tracking:** confirm `videos/**/*.json` is tracked; media under
  `public/assets/` stays ignored.

**Risk / decision:** if total-from-audio ≠ sum-of-sections, the last
`<Series.Sequence>` could clip or leave a gap. Decision: section durations are
authoritative for *sequencing*; treat `parseMedia` duration as the *total* and
pad/trim the final section to close the gap. (Stage 3 makes sections sum to the
VO naturally, so this is mostly a guard.)

**Acceptance:** `npx remotion render ExplainerVideo --props=videos/compound-interest/props.json out/ci.mp4`
produces a video whose length equals the VO (once a VO exists); `npm run lint` clean.

**Add dep:** `@remotion/media-parser` (pinned to `4.0.482`).

---

## Stage 2 — Whisper transcription  → `0.3.0`

**Outcome:** `tools/transcribe.mjs <slug>` turns `vo.wav` into
`videos/<slug>/captions.json`.

Grounded API (from `@remotion/install-whisper-cpp`, Remotion 4.0.x):

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

- **16kHz requirement:** `transcribe` needs a 16-bit/16kHz WAV. Add a pre-step
  that resamples `vo.wav` → a temp 16kHz wav (ffmpeg; Remotion bundles one, else
  document the dependency). Don't mutate the user's original `vo.wav`.
- **Model:** default `medium.en` (good accuracy for English explainers); expose
  `--model` to drop to `base.en` for speed. whisper.cpp + model install once,
  cached to a gitignored `whisper.cpp/` folder.
- **Wiring:** a thin `npm run transcribe -- <slug>` script.

**Risk:** first-run install is large/slow and platform-specific. Mitigation:
install is idempotent + cached; print clear progress (`onProgress`).

**Acceptance:** `node tools/transcribe.mjs compound-interest` writes a
`captions.json` whose words line up audibly with the VO when previewed via
`CaptionTrack`.

**Decision needed:** adopt `@remotion/captions`' `Caption` type in
`src/lib/captions.ts` (a tidy alignment, but touches `src/` → would fold a small
engine change into this stage), or keep our local subset type (zero `src/`
change). Leaning **keep local subset** to keep this stage tools-only.

---

## Stage 3 — Script → auto-draft  → `0.4.0`

**Outcome:** `tools/auto-draft.mjs <slug>` reads `scripts/<slug>.md` +
`videos/<slug>/captions.json` and emits `videos/<slug>/props.json`.

**Parse the script** (`scripts/sample-topic.md` is the template):
- Each `## Heading (kind)` → one section; `kind` is read from the parenthetical
  (`title` | `bars` | `text`).
- Body text under the heading = the spoken words for that section.
- `[VISUAL: ...]` note → scene specifics (title text, bar data, etc.).

**The hard part — align script sections to the transcript** so each section's
`durationInFrames` is *derived from the voice*:
1. Normalize both streams (lowercase, strip punctuation, expand obvious
   number-words if cheap).
2. Walk a monotonic pointer through the caption words, consuming the words of
   each section in order. Section `start = firstWord.startMs`,
   `end = lastWord.endMs`.
3. Make sections contiguous (`section[i].end = section[i+1].start`) so scenes
   tile the whole VO with no gaps.
4. `durationInFrames = round((end - start) / 1000 * fps)`.

**Fallback (must have):** if alignment confidence is low for a section
(transcript drifted from script — disfluencies, "8%" vs "eight percent"), fall
back to a proportional split by word count and **flag that section in a printed
report** for manual polish in Studio. Never silently emit bad timings.

**Bar data:** parse numbers from the `[VISUAL: bar chart — 1000 / 1469 / ...]`
note for a first draft; leave a clear placeholder + flag when unparseable.

**Acceptance:** running auto-draft on the compound-interest slug yields a
`props.json` that renders end-to-end, with section cuts that land on the
narration's section boundaries (±~0.3s).

---

## Open decisions (resolve as we build, not now)

1. **VO-derived duration in Stage 1 vs Stage 2** — fold `parseMedia` duration
   into 0.2.0 (recommended, it's the engine change that justifies the bump) or
   defer to when a real VO first exists.
2. **`@remotion/captions` adoption** — see Stage 2 decision.
3. **Number-word normalization depth** — how hard to try on alignment before
   falling back. Start shallow; improve only if real scripts demand it.

## Out of scope (tracked separately on the roadmap)

End-to-end auto mode, YouTube upload + thumbnail, the template library, Shorts
variant, and brand font. This doc is only the voice-driven core.
