/**
 * Brand/design tokens — the single source of truth for the channel's look.
 *
 * Because every video imports from here, changing a color or font once
 * re-skins the entire back-catalog. This is the main reason a code-driven
 * explainer channel stays visually consistent at scale.
 */
export const theme = {
  colors: {
    bg: "#0B0F1A",
    bgAlt: "#121826",
    text: "#F8FAFC",
    textMuted: "#94A3B8",
    accent: "#38BDF8",
    accent2: "#A78BFA",
    grid: "#1E293B",
    // Cycled through for multi-series charts.
    barColors: ["#38BDF8", "#A78BFA", "#34D399", "#FBBF24", "#FB7185"],
  },
  fonts: {
    // System stack for the starter. To use a real brand font, see the
    // skill's fonts.md rule (loadFont from @remotion/google-fonts).
    heading: "Inter, system-ui, -apple-system, Segoe UI, sans-serif",
    body: "Inter, system-ui, -apple-system, Segoe UI, sans-serif",
  },
} as const;
