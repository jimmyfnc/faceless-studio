import { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { useBrand } from "../theme/BrandProvider";
import { chunkCaptions, type CaptionWord } from "../lib/captions";

/**
 * Word-synced captions, shown one **phrase block at a time**. Each block holds
 * still while its words are spoken (the active word highlights in the accent),
 * then the next block takes over — far easier to read than text that slides on
 * every word.
 *
 * `words` comes straight from Whisper transcription of your voiceover, so the
 * captions stay aligned to the narration.
 */
export const CaptionTrack: React.FC<{
  words: CaptionWord[];
  /** Max words per block before it breaks (sentences break earlier). */
  maxWords?: number;
}> = ({ words, maxWords = 6 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const brand = useBrand();
  const ms = (frame / fps) * 1000;

  const blocks = useMemo(() => chunkCaptions(words, maxWords), [words, maxWords]);
  if (!blocks.length || ms < blocks[0].startMs) return null;

  // Current block = the last one that has started; it stays up until the next
  // begins, so the text holds still.
  let bi = 0;
  for (let i = 0; i < blocks.length; i++) {
    if (blocks[i].startMs <= ms) bi = i;
    else break;
  }
  const block = blocks[bi];
  // Don't let the final block linger over the outro.
  if (bi === blocks.length - 1 && ms > block.endMs + 800) return null;

  return (
    <AbsoluteFill
      style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 140 }}
    >
      <div
        style={{
          maxWidth: 1500,
          textAlign: "center",
          fontFamily: brand.fonts.body,
          fontSize: 56,
          fontWeight: 800,
          lineHeight: 1.35,
          textShadow: "0 4px 24px rgba(0,0,0,0.6)",
        }}
      >
        {block.words.map((w, i) => {
          const isActive = ms >= w.startMs && ms < w.endMs;
          return (
            <span
              key={`${w.startMs}-${i}`}
              style={{ color: isActive ? brand.colors.accent : brand.colors.text, margin: "0 8px" }}
            >
              {w.text}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
