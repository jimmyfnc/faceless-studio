import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme/tokens";

export const TextScene: React.FC<{
  heading: string;
  body?: string;
  accentColor: string;
}> = ({ heading, body, accentColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

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
        fontFamily: theme.fonts.heading,
      }}
    >
      <div style={{ transform: `translateY(${y}px)`, opacity, maxWidth: 1300 }}>
        <h1
          style={{
            fontSize: 84,
            fontWeight: 800,
            color: theme.colors.text,
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
              color: theme.colors.textMuted,
              marginTop: 28,
              lineHeight: 1.4,
              borderLeft: `6px solid ${accentColor}`,
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
