import { AbsoluteFill, Img, OffthreadVideo, interpolate, useCurrentFrame } from "remotion";
import { useBrand } from "../theme/BrandProvider";
import { resolveSrc } from "./ImageScene";

const isVideoSrc = (src: string) => /\.(mp4|webm|mov)$/i.test(src.split("?")[0]);

/**
 * Visual-density scene: full-frame images that crossfade in sequence over the
 * section, each with its own camera move. A concept label sits top-left, a dark
 * bottom gradient keeps the captions legible, and the global CaptionTrack runs
 * over the top. This is the engine of the "lots going on" look.
 *
 * Motion: adjacent images truly crossfade (the outgoing image holds while the
 * incoming fades in on top — no dip to background), and each image cycles
 * through a table of Ken Burns moves (push in / pull back / pan left / pan
 * right / drift diagonally) so two consecutive images never move the same way.
 * Pan distances stay inside the over-scan that the scale provides.
 */

type Move = { from: { x: number; y: number; s: number }; to: { x: number; y: number; s: number } };

// Scales ≥1.05 over-scan a 1920×1080 frame by ≥48px/27px per side, so pans of
// up to ~40px/24px never reveal the edge.
const MOVES: Move[] = [
  { from: { x: 0, y: 0, s: 1.05 }, to: { x: 0, y: -14, s: 1.18 } }, // push in, tilt up
  { from: { x: 34, y: 0, s: 1.16 }, to: { x: -34, y: 0, s: 1.08 } }, // pan left, ease out
  { from: { x: 0, y: 10, s: 1.19 }, to: { x: 0, y: -8, s: 1.06 } }, // pull back, rise
  { from: { x: -34, y: -12, s: 1.08 }, to: { x: 30, y: 10, s: 1.17 } }, // drift down-right, push
  { from: { x: 0, y: -10, s: 1.06 }, to: { x: -28, y: 12, s: 1.16 } }, // push in, drift down-left
  { from: { x: 28, y: 12, s: 1.18 }, to: { x: -20, y: -10, s: 1.07 } }, // pull back, drift up-left
];

export const MontageScene: React.FC<{
  images: { src: string }[];
  heading?: string;
  durationInFrames: number;
}> = ({ images, heading, durationInFrames }) => {
  const frame = useCurrentFrame();
  const brand = useBrand();
  const n = Math.max(images.length, 1);
  const per = durationInFrames / n; // frames each image is the focus
  const fade = Math.min(15, per / 2);

  return (
    <AbsoluteFill style={{ backgroundColor: brand.colors.bg, overflow: "hidden" }}>
      {images.map((img, i) => {
        const local = frame - i * per;
        // True crossfade: hold at full opacity until the *next* image has fully
        // faded in on top (the extra `fade` past `per`), then release. The first
        // image skips its fade-in so a section never opens on a dark frame.
        const opacity = interpolate(
          local,
          [0, i === 0 ? 0.001 : fade, per + fade - 0.001, per + fade],
          [i === 0 ? 1 : 0, 1, 1, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        );
        if (opacity <= 0.001) return null;
        const move = MOVES[i % MOVES.length];
        const t = interpolate(local, [0, per + fade], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const s = move.from.s + (move.to.s - move.from.s) * t;
        const x = move.from.x + (move.to.x - move.from.x) * t;
        const y = move.from.y + (move.to.y - move.from.y) * t;
        const mediaStyle = {
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `translate(${x}px, ${y}px) scale(${s})`,
        } as const;
        return (
          <AbsoluteFill key={i} style={{ opacity }}>
            {isVideoSrc(img.src) ? (
              // Animated beat: a short generated clip (muted — the VO is the
              // audio). If the clip is shorter than its slot, Remotion holds
              // its last frame, so a 5s clip covers a 7s dwell gracefully.
              <OffthreadVideo src={resolveSrc(img.src)} muted style={mediaStyle} />
            ) : (
              <Img src={resolveSrc(img.src)} style={mediaStyle} />
            )}
          </AbsoluteFill>
        );
      })}

      {/* Legibility: darken top (label) and bottom (captions). */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.78) 100%)",
        }}
      />

      {heading ? (
        <div
          style={{
            position: "absolute",
            top: 64,
            left: 72,
            right: 72,
            fontFamily: brand.fonts.heading,
            fontSize: 64,
            fontWeight: 800,
            color: brand.colors.text,
            letterSpacing: -1,
            textShadow: "0 4px 24px rgba(0,0,0,0.7)",
          }}
        >
          <span style={{ borderBottom: `6px solid ${brand.colors.accent}`, paddingBottom: 8 }}>{heading}</span>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
