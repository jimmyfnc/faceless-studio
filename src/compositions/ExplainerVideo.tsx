import { z } from "zod";
import { zColor } from "@remotion/zod-types";
import {
  AbsoluteFill,
  Audio,
  Series,
  staticFile,
  type CalculateMetadataFunction,
} from "remotion";
import { TitleCard } from "../scenes/TitleCard";
import { TextScene } from "../scenes/TextScene";
import { BarChartScene } from "../scenes/BarChartScene";
import { CaptionTrack } from "../scenes/CaptionTrack";
import { theme } from "../theme/tokens";

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
]);

export const explainerSchema = z.object({
  accentColor: zColor(),
  /** Path under public/ to a voiceover file, e.g. "assets/my-video/vo.wav". */
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

/**
 * Duration is the sum of every section. Once you have a real voiceover,
 * swap this to derive duration from the audio length (see calculate-metadata
 * rule + getAudioDurationInSeconds) so the video always matches your VO.
 */
export const calculateExplainerMetadata: CalculateMetadataFunction<
  ExplainerProps
> = ({ props }) => {
  const total = props.sections.reduce(
    (sum, section) => sum + section.durationInFrames,
    0,
  );
  return { durationInFrames: Math.max(total, 1) };
};

export const ExplainerVideo: React.FC<ExplainerProps> = ({
  accentColor,
  voiceoverSrc,
  sections,
  captions,
}) => {
  return (
    <AbsoluteFill
      style={{ backgroundColor: theme.colors.bg, fontFamily: theme.fonts.body }}
    >
      {voiceoverSrc ? <Audio src={staticFile(voiceoverSrc)} /> : null}

      <Series>
        {sections.map((section, i) => (
          <Series.Sequence
            key={i}
            durationInFrames={section.durationInFrames}
          >
            {section.kind === "title" ? (
              <TitleCard
                title={section.text}
                subtitle={section.subtitle}
                accentColor={accentColor}
              />
            ) : section.kind === "bars" ? (
              <BarChartScene
                heading={section.heading}
                data={section.data}
                accentColor={accentColor}
              />
            ) : (
              <TextScene
                heading={section.heading}
                body={section.body}
                accentColor={accentColor}
              />
            )}
          </Series.Sequence>
        ))}
      </Series>

      {/* Captions overlay the whole timeline, independent of scene boundaries. */}
      <CaptionTrack words={captions} accentColor={accentColor} />
    </AbsoluteFill>
  );
};
