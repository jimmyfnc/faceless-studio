import { AbsoluteFill, Img, interpolate, useCurrentFrame } from "remotion";
import { useBrand } from "../theme/BrandProvider";
import { resolveSrc } from "./ImageScene";

/**
 * Visual-density scene: a sequence of full-frame images that crossfade from one
 * to the next over the section's duration, each with a slow Ken Burns push. A
 * concept label sits top-left, a dark bottom gradient keeps the captions legible,
 * and the global CaptionTrack runs over the top. This is the engine of the
 * "lots going on" look — images change every few seconds behind the narration.
 */
export const MontageScene: React.FC<{
  images: { src: string }[];
  heading?: string;
  durationInFrames: number;
}> = ({ images, heading, durationInFrames }) => {
  const frame = useCurrentFrame();
  const brand = useBrand();
  const n = Math.max(images.length, 1);
  const per = durationInFrames / n; // frames each image is the focus
  const fade = Math.min(12, per / 2);

  return (
    <AbsoluteFill style={{ backgroundColor: brand.colors.bg, overflow: "hidden" }}>
      {images.map((img, i) => {
        const local = frame - i * per;
        const opacity = interpolate(local, [0, fade, per - fade, per], [0, 1, 1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        if (opacity <= 0.001) return null;
        const scale = interpolate(local, [0, per + fade], [1.02, 1.12], { extrapolateRight: "clamp" });
        return (
          <AbsoluteFill key={i} style={{ opacity }}>
            <Img
              src={resolveSrc(img.src)}
              style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${scale})` }}
            />
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
