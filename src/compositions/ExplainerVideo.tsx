import { z } from "zod";
import {
  AbsoluteFill,
  Audio,
  Series,
  staticFile,
  type CalculateMetadataFunction,
} from "remotion";
import { parseMedia } from "@remotion/media-parser";
import { TitleCard } from "../scenes/TitleCard";
import { TextScene } from "../scenes/TextScene";
import { BarChartScene } from "../scenes/BarChartScene";
import { ImageScene } from "../scenes/ImageScene";
import { VideoScene } from "../scenes/VideoScene";
import { CaptionTrack } from "../scenes/CaptionTrack";
import { BrandProvider } from "../theme/BrandProvider";
import { brandSchema, defaultBrand } from "../theme/tokens";

/** Frames per second for every explainer. Shared with the composition in Root. */
export const FPS = 30;

const barDatum = z.object({
  label: z.string(),
  value: z.number(),
});

/**
 * A "section" is one scene. Sections are rendered back-to-back. In the real
 * pipeline each section's durationInFrames is derived from the span of your
 * voiceover that covers it (from Whisper word timestamps), so visuals stay
 * locked to your narration.
 */
const sectionSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("title"),
    durationInFrames: z.number(),
    text: z.string(),
    subtitle: z.string().optional(),
  }),
  z.object({
    kind: z.literal("bars"),
    durationInFrames: z.number(),
    heading: z.string(),
    data: z.array(barDatum),
  }),
  z.object({
    kind: z.literal("text"),
    durationInFrames: z.number(),
    heading: z.string(),
    body: z.string().optional(),
  }),
  z.object({
    kind: z.literal("image"),
    durationInFrames: z.number(),
    /** Path under public/ (e.g. "assets/<ch>/<slug>/mars.jpg") or an https URL. */
    src: z.string(),
    fit: z.enum(["cover", "contain"]).optional(),
    kenBurns: z.boolean().optional(),
    /** Corner label — handy for attribution ("Photo — NASA"). */
    caption: z.string().optional(),
  }),
  z.object({
    kind: z.literal("video"),
    durationInFrames: z.number(),
    src: z.string(),
    fit: z.enum(["cover", "contain"]).optional(),
    muted: z.boolean().optional(),
    caption: z.string().optional(),
  }),
]);

export const explainerSchema = z.object({
  /**
   * The channel's brand (colors + fonts). Omit to use `defaultBrand`; in the
   * pipeline the render wrapper merges `channels/<id>/brand.json` in here.
   */
  brand: brandSchema.optional(),
  /** Path under public/ to a voiceover file, e.g. "assets/<id>/<slug>/vo.wav". */
  voiceoverSrc: z.string().optional(),
  sections: z.array(sectionSchema),
  /** Word-level captions from Whisper (times in ms, relative to the VO). */
  captions: z.array(
    z.object({
      text: z.string(),
      startMs: z.number(),
      endMs: z.number(),
    }),
  ),
});

export type ExplainerProps = z.infer<typeof explainerSchema>;
type Section = ExplainerProps["sections"][number];

const Scene: React.FC<{ section: Section }> = ({ section }) => {
  switch (section.kind) {
    case "title":
      return <TitleCard title={section.text} subtitle={section.subtitle} />;
    case "bars":
      return <BarChartScene heading={section.heading} data={section.data} />;
    case "text":
      return <TextScene heading={section.heading} body={section.body} />;
    case "image":
      return (
        <ImageScene
          src={section.src}
          fit={section.fit}
          kenBurns={section.kenBurns}
          caption={section.caption}
          durationInFrames={section.durationInFrames}
        />
      );
    case "video":
      return (
        <VideoScene
          src={section.src}
          fit={section.fit}
          muted={section.muted}
          caption={section.caption}
        />
      );
  }
};

/**
 * Duration matches the voiceover when one is supplied (authoritative — the
 * voice drives the timeline), parsed via `@remotion/media-parser`. With no VO,
 * it falls back to the sum of every section's frames. A failed parse also falls
 * back, so a missing/odd VO never blocks a render.
 */
export const calculateExplainerMetadata: CalculateMetadataFunction<
  ExplainerProps
> = async ({ props }) => {
  const sectionFrames = props.sections.reduce(
    (sum, section) => sum + section.durationInFrames,
    0,
  );
  let durationInFrames = Math.max(sectionFrames, 1);

  if (props.voiceoverSrc) {
    try {
      const { slowDurationInSeconds } = await parseMedia({
        src: staticFile(props.voiceoverSrc),
        fields: { slowDurationInSeconds: true },
      });
      if (slowDurationInSeconds > 0) {
        durationInFrames = Math.round(slowDurationInSeconds * FPS);
      }
    } catch {
      // Keep the section-sum fallback if the VO can't be parsed.
    }
  }

  return { durationInFrames };
};

export const ExplainerVideo: React.FC<ExplainerProps> = ({
  brand,
  voiceoverSrc,
  sections,
  captions,
}) => {
  const activeBrand = brand ?? defaultBrand;

  return (
    <BrandProvider brand={activeBrand}>
      <AbsoluteFill
        style={{
          backgroundColor: activeBrand.colors.bg,
          fontFamily: activeBrand.fonts.body,
        }}
      >
        {voiceoverSrc ? <Audio src={staticFile(voiceoverSrc)} /> : null}

        <Series>
          {sections.map((section, i) => (
            <Series.Sequence key={i} durationInFrames={section.durationInFrames}>
              <Scene section={section} />
            </Series.Sequence>
          ))}
        </Series>

        {/* Captions overlay the whole timeline, independent of scene boundaries. */}
        <CaptionTrack words={captions} />
      </AbsoluteFill>
    </BrandProvider>
  );
};
