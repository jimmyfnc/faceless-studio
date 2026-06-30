import { useBrand } from "../theme/BrandProvider";

/**
 * A small lower-left label over image/video scenes — handy for attribution
 * (e.g. "Photo — NASA / public domain"). Distinct from the VO `CaptionTrack`,
 * which is the word-synced narration at the bottom-center.
 */
export const MediaCaption: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const brand = useBrand();
  return (
    <div
      style={{
        position: "absolute",
        left: 48,
        bottom: 48,
        padding: "10px 18px",
        backgroundColor: "rgba(0,0,0,0.55)",
        color: brand.colors.text,
        fontFamily: brand.fonts.body,
        fontSize: 28,
        fontWeight: 600,
        borderRadius: 8,
        borderLeft: `4px solid ${brand.colors.accent}`,
      }}
    >
      {children}
    </div>
  );
};
