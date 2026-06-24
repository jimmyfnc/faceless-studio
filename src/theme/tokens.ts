import { z } from "zod";
import { zColor } from "@remotion/zod-types";

/**
 * Brand/design tokens — the look of a single channel.
 *
 * This is *data*, not engine config: a channel supplies its own
 * `channels/<id>/brand.json` (validated by `brandSchema`) and the render
 * wrapper merges it into the video's props. The engine only ships
 * `defaultBrand` as a fallback, so re-skinning a channel never touches `src/`
 * or bumps the engine version.
 *
 * Because every scene reads the brand (via `useBrand()`), changing one
 * brand.json re-skins that channel's entire back-catalog.
 */
export const brandSchema = z.object({
  colors: z.object({
    bg: zColor(),
    bgAlt: zColor(),
    text: zColor(),
    textMuted: zColor(),
    accent: zColor(),
    accent2: zColor(),
    grid: zColor(),
    /** Cycled through for multi-series charts. */
    barColors: z.array(zColor()),
  }),
  fonts: z.object({
    heading: z.string(),
    body: z.string(),
  }),
});

export type Brand = z.infer<typeof brandSchema>;

/** Fallback brand, used when a video supplies no `brand`. */
export const defaultBrand: Brand = {
  colors: {
    bg: "#0B0F1A",
    bgAlt: "#121826",
    text: "#F8FAFC",
    textMuted: "#94A3B8",
    accent: "#38BDF8",
    accent2: "#A78BFA",
    grid: "#1E293B",
    barColors: ["#38BDF8", "#A78BFA", "#34D399", "#FBBF24", "#FB7185"],
  },
  fonts: {
    // System stack for the starter. To use a real brand font, see the
    // skill's fonts.md rule (loadFont from @remotion/google-fonts).
    heading: "Inter, system-ui, -apple-system, Segoe UI, sans-serif",
    body: "Inter, system-ui, -apple-system, Segoe UI, sans-serif",
  },
};
