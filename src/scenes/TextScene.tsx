import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { useBrand } from "../theme/BrandProvider";

export const TextScene: React.FC<{
  heading: string;
  body?: string;
}> = ({ heading, body }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const brand = useBrand();

  const enter = spring({ frame, fps, config: { damping: 200 } });
  const y = interpolate(enter, [0, 1], [30, 0]);
  const opacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        padding: 140,
        fontFamily: brand.fonts.heading,
      }}
    >
      <div style={{ transform: `translateY(${y}px)`, opacity, maxWidth: 1300 }}>
        <h1
          style={{
            fontSize: 84,
            fontWeight: 800,
            color: brand.colors.text,
            margin: 0,
            lineHeight: 1.1,
            letterSpacing: -1.5,
          }}
        >
          {heading}
        </h1>
        {body ? (
          <p
            style={{
              fontSize: 44,
              color: brand.colors.textMuted,
              marginTop: 28,
              lineHeight: 1.4,
              borderLeft: `6px solid ${brand.colors.accent}`,
              paddingLeft: 28,
            }}
          >
            {body}
          </p>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
