# Script: How Compound Interest Works

> One `## Label (kind)` = one scene; `kind` is `title`, `bars`, or `text`.
> Write the spoken lines (you'll read these aloud), then a `[VISUAL: ...]` note
> that auto-draft turns into the scene's on-screen content:
>   title — "Main title" | "Optional subtitle"
>   text  — "Heading" | "Optional body"
>   bars  — "Heading"; Label=Value, Label=Value, …
>   image — "assets/<ch>/<slug>/photo.jpg" | "Photo — NASA"   (caption = attribution)
>   video — "assets/<ch>/<slug>/clip.mp4" | "B-roll — Pexels"
> Section durations come from the voice (caption timings), not these notes.

## Hook (title)

What if doing nothing was the smartest money move you could make?
[VISUAL: title — "How Compound Interest Works" | "A 60-second explainer"]

## The setup (bars)

Say you invest a thousand dollars and earn eight percent a year.
After five years it's about fifteen hundred. After thirty? Over ten thousand.
[VISUAL: bars — "$1,000 invested at 8% / year"; Year 0=1000, Year 5=1469, Year 10=2159, Year 20=4661, Year 30=10063]

## The payoff (text)

The lesson isn't timing the market. It's time *in* the market.
Start early, and the curve does the work for you.
[VISUAL: text — "Time beats timing." | "Start early — the curve does the work."]

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
