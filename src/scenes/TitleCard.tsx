import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme/tokens";

export const TitleCard: React.FC<{
  title: string;
  subtitle?: string;
  accentColor: string;
}> = ({ title, subtitle, accentColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({ frame, fps, config: { damping: 200 } });
  const opacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });
  const y = interpolate(enter, [0, 1], [40, 0]);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        padding: 120,
        fontFamily: theme.fonts.heading,
      }}
    >
      <div style={{ transform: `translateY(${y}px)`, opacity }}>
        <div
          style={{
            width: 90,
            height: 6,
            backgroundColor: accentColor,
            margin: "0 auto 40px",
            borderRadius: 3,
          }}
        />
        <h1
          style={{
            fontSize: 96,
            fontWeight: 800,
            color: theme.colors.text,
            margin: 0,
            lineHeight: 1.05,
            letterSpacing: -2,
          }}
        >
          {title}
        </h1>
        {subtitle ? (
          <p
            style={{
              fontSize: 40,
              color: theme.colors.textMuted,
              marginTop: 32,
              fontWeight: 500,
            }}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
