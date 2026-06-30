import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { useBrand } from "../theme/BrandProvider";
import { MediaCaption } from "./MediaCaption";

/** Resolve a public/ path or pass through a remote URL. */
export const resolveSrc = (src: string): string =>
  /^https?:\/\//.test(src) ? src : staticFile(src);

/**
 * A full-frame still image with an optional slow Ken Burns push-in. Use for
 * public-domain / licensed photos, AI-generated stills, or your own images.
 * The optional caption doubles as an attribution label (e.g. "Photo — NASA").
 */
export const ImageScene: React.FC<{
  src: string;
  fit?: "cover" | "contain";
  kenBurns?: boolean;
  caption?: string;
  durationInFrames: number;
}> = ({ src, fit = "cover", kenBurns = true, caption, durationInFrames }) => {
  const frame = useCurrentFrame();
  const brand = useBrand();
  const scale = kenBurns
    ? interpolate(frame, [0, durationInFrames], [1, 1.08], { extrapolateRight: "clamp" })
    : 1;

  return (
    <AbsoluteFill style={{ backgroundColor: brand.colors.bg, overflow: "hidden" }}>
      <Img
        src={resolveSrc(src)}
        style={{ width: "100%", height: "100%", objectFit: fit, transform: `scale(${scale})` }}
      />
      {caption ? <MediaCaption>{caption}</MediaCaption> : null}
    </AbsoluteFill>
  );
};
