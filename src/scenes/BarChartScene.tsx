import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme/tokens";

export type BarDatum = { label: string; value: number };

const CHART_HEIGHT = 540;
const STAGGER = 6;

/**
 * Animated bar chart — driven entirely by useCurrentFrame (never by a
 * charting library's own animation, which flickers during render).
 * Each bar grows and its value counts up via a staggered spring.
 */
export const BarChartScene: React.FC<{
  heading: string;
  data: BarDatum[];
  accentColor: string;
}> = ({ heading, data, accentColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <AbsoluteFill
      style={{ padding: 100, fontFamily: theme.fonts.heading, justifyContent: "flex-end" }}
    >
      <h1
        style={{
          fontSize: 56,
          fontWeight: 800,
          color: theme.colors.text,
          margin: "0 0 56px",
          letterSpacing: -1,
        }}
      >
        <span
          style={{
            borderBottom: `6px solid ${accentColor}`,
            paddingBottom: 10,
          }}
        >
          {heading}
        </span>
      </h1>

      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 40,
          height: CHART_HEIGHT,
        }}
      >
        {data.map((d, i) => {
          const grow = spring({
            frame,
            fps,
            delay: i * STAGGER,
            config: { damping: 200 },
          });
          const h = (d.value / max) * CHART_HEIGHT * grow;
          const color = theme.colors.barColors[i % theme.colors.barColors.length];

          return (
            <div
              key={d.label}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-end",
              }}
            >
              <div
                style={{
                  fontSize: 34,
                  fontWeight: 700,
                  color: theme.colors.text,
                  marginBottom: 14,
                  opacity: grow,
                }}
              >
                {Math.round(d.value * grow).toLocaleString()}
              </div>
              <div
                style={{
                  width: "100%",
                  height: Math.max(h, 0),
                  backgroundColor: color,
                  borderRadius: "12px 12px 0 0",
                }}
              />
              <div
                style={{
                  fontSize: 28,
                  color: theme.colors.textMuted,
                  marginTop: 18,
                  fontWeight: 500,
                }}
              >
                {d.label}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
