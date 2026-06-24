import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { useBrand } from "../theme/BrandProvider";
import type { CaptionWord } from "../lib/captions";

/**
 * Word-synced caption overlay. Maps the current frame to milliseconds and
 * highlights the active word, showing a small window of context around it.
 *
 * In the real pipeline, `words` comes straight from Whisper transcription of
 * your voiceover, so captions and narration are always perfectly aligned.
 */
export const CaptionTrack: React.FC<{
  words: CaptionWord[];
  /** Words shown on screen around the active word. */
  windowSize?: number;
}> = ({ words, windowSize = 9 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const brand = useBrand();
  const ms = (frame / fps) * 1000;

  const activeIdx = words.findIndex((w) => ms >= w.startMs && ms < w.endMs);
  if (activeIdx === -1) return null;

  const lead = Math.floor((windowSize - 1) / 2);
  const start = Math.max(0, activeIdx - lead);
  const visible = words.slice(start, start + windowSize);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: 140,
      }}
    >
      <div
        style={{
          maxWidth: 1400,
          textAlign: "center",
          fontFamily: brand.fonts.body,
          fontSize: 56,
          fontWeight: 800,
          lineHeight: 1.3,
          textShadow: "0 4px 24px rgba(0,0,0,0.6)",
        }}
      >
        {visible.map((w, i) => {
          const isActive = start + i === activeIdx;
          return (
            <span
              key={`${w.startMs}-${i}`}
              style={{
                color: isActive ? brand.colors.accent : brand.colors.text,
                display: "inline-block",
                margin: "0 8px",
                transform: isActive ? "scale(1.08)" : "scale(1)",
              }}
            >
              {w.text}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
