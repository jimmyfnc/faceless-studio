import type { ExplainerProps } from "../compositions/ExplainerVideo";

/**
 * The engine's no-content default — what `npm run dev` shows out of the box.
 * It omits `brand`, so it renders with `defaultBrand`. Real videos live under
 * `channels/<id>/videos/<slug>/props.json` (see the example channel); in the
 * pipeline those are generated from your script + Whisper captions. The
 * captions below are illustrative (no VO attached); they demo the synced word
 * highlight over the opening seconds.
 */
export const sampleExplainer: ExplainerProps = {
  // voiceoverSrc: "assets/example-explainers/compound-interest/vo.wav",
  sections: [
    {
      kind: "title",
      durationInFrames: 90,
      text: "How Compound Interest Works",
      subtitle: "A 60-second explainer",
    },
    {
      kind: "bars",
      durationInFrames: 150,
      heading: "$1,000 invested at 8% / year",
      data: [
        { label: "Year 0", value: 1000 },
        { label: "Year 5", value: 1469 },
        { label: "Year 10", value: 2159 },
        { label: "Year 20", value: 4661 },
        { label: "Year 30", value: 10063 },
      ],
    },
    {
      kind: "text",
      durationInFrames: 120,
      heading: "Time beats timing.",
      body: "Start early — the curve does the work.",
    },
  ],
  captions: [
    { text: "How", startMs: 200, endMs: 520 },
    { text: "compound", startMs: 520, endMs: 1050 },
    { text: "interest", startMs: 1050, endMs: 1550 },
    { text: "quietly", startMs: 1550, endMs: 2000 },
    { text: "builds", startMs: 2000, endMs: 2400 },
    { text: "real", startMs: 2400, endMs: 2700 },
    { text: "wealth", startMs: 2700, endMs: 3200 },
  ],
};
