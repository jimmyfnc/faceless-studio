import { AbsoluteFill, OffthreadVideo } from "remotion";
import { useBrand } from "../theme/BrandProvider";
import { MediaCaption } from "./MediaCaption";
import { resolveSrc } from "./ImageScene";

/**
 * A full-frame b-roll clip. Muted by default — the creator's voiceover is the
 * audio track. Use for licensed / public-domain / AI-generated / your own video.
 */
export const VideoScene: React.FC<{
  src: string;
  fit?: "cover" | "contain";
  muted?: boolean;
  caption?: string;
}> = ({ src, fit = "cover", muted = true, caption }) => {
  const brand = useBrand();

  return (
    <AbsoluteFill style={{ backgroundColor: brand.colors.bg, overflow: "hidden" }}>
      <OffthreadVideo
        src={resolveSrc(src)}
        muted={muted}
        style={{ width: "100%", height: "100%", objectFit: fit }}
      />
      {caption ? <MediaCaption>{caption}</MediaCaption> : null}
    </AbsoluteFill>
  );
};
