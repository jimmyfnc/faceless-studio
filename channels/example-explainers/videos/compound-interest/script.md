# Script: How Compound Interest Works

> Template for an explainer script. One `##` section = one scene.
> Inline `[VISUAL: ...]` notes tell the auto-draft step what to generate.
> Write in spoken language — you'll read this aloud for the voiceover.

## Hook (title)

What if doing nothing was the smartest money move you could make?
[VISUAL: title card — "How Compound Interest Works"]

## The setup (bars)

Say you invest a thousand dollars and earn eight percent a year.
After five years it's about fifteen hundred. After thirty? Over ten thousand.
[VISUAL: bar chart — 1000 / 1469 / 2159 / 4661 / 10063 across years 0,5,10,20,30]

## The payoff (text)

The lesson isn't timing the market. It's time *in* the market.
Start early, and the curve does the work for you.
[VISUAL: text — "Time beats timing."]

---

### Pipeline notes

This script lives at `channels/example-explainers/videos/compound-interest/script.md`.
Its slug is `compound-interest` in channel `example-explainers`.

1. Record yourself reading the lines above →
   `public/assets/example-explainers/compound-interest/vo.wav`
2. Transcribe (Stage 2, Whisper) → `../captions.json` (word-level timestamps)
3. Auto-draft (Stage 3) maps each `##` section to a scene and aligns it to the
   captions → `props.json`; `[VISUAL: ...]` becomes a ComfyUI/Nano-Banana
   generation or a chart with this data
4. Polish in Remotion Studio, then render:
   `npm run studio -- example-explainers compound-interest`
   `npm run render -- example-explainers compound-interest`
