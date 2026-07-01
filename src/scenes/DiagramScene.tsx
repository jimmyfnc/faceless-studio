import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { useBrand } from "../theme/BrandProvider";

export type DiagramNode = { label: string; active?: boolean };
export type DiagramLayout = "flow" | "steps" | "stack";

/**
 * Engine-drawn explanatory diagram — the *accurate* counterpart to MontageScene.
 *
 * Where the clay montage sells a feeling, a diagram teaches a structure: every
 * label is set by us, so it can't hallucinate anatomy or bake in garbled text.
 * Nodes reveal one at a time (staggered spring) over the section, on-brand via
 * `useBrand()`. Three layouts cover the common shapes:
 *   - `flow`  — a left→right pipeline of cards joined by arrows (few-shot,
 *               input→model→output). Stacks vertically in portrait.
 *   - `steps` — a numbered top→down list (chain-of-thought reasoning steps).
 *   - `stack` — wide slabs built bottom→up (the prompt·context·loop·harness
 *               layer cake). Node 0 is the bottom layer.
 * A node flagged `active` is filled with the accent (the layer/step you're on).
 */
export const DiagramScene: React.FC<{
  heading?: string;
  layout?: DiagramLayout;
  nodes: DiagramNode[];
  durationInFrames: number;
}> = ({ heading, layout = "flow", nodes, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const brand = useBrand();
  const portrait = height > width;
  const u = portrait ? 0.8 : 1; // shrink a touch for the vertical short format
  const n = Math.max(nodes.length, 1);

  // Reveal cadence: spread the entrances across the first ~62% of the section,
  // so the last node is fully settled well before the scene ends.
  const stride = (durationInFrames * 0.62) / (n + 1);
  const reveal = (i: number) =>
    spring({ frame, fps, delay: Math.round(8 + i * stride), config: { damping: 200 } });

  return (
    <AbsoluteFill style={{ backgroundColor: brand.colors.bg, overflow: "hidden" }}>
      {/* Subtle vignette so nodes sit on a slightly deeper field. */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(120% 120% at 50% 38%, ${brand.colors.bgAlt} 0%, ${brand.colors.bg} 70%)`,
        }}
      />

      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          paddingLeft: 72 * u,
          paddingRight: 72 * u,
          paddingTop: 210 * u,
          paddingBottom: portrait ? 560 : 300,
        }}
      >
        {layout === "steps" ? (
          <Steps nodes={nodes} reveal={reveal} brand={brand} u={u} />
        ) : layout === "stack" ? (
          <Stack nodes={nodes} reveal={reveal} brand={brand} u={u} />
        ) : (
          <Flow nodes={nodes} reveal={reveal} brand={brand} u={u} vertical={portrait} />
        )}
      </AbsoluteFill>

      {heading ? (
        <div
          style={{
            position: "absolute",
            top: 64,
            left: 72,
            right: 72,
            fontFamily: brand.fonts.heading,
            fontSize: 64 * u,
            fontWeight: 800,
            color: brand.colors.text,
            letterSpacing: -1,
          }}
        >
          <span style={{ borderBottom: `6px solid ${brand.colors.accent}`, paddingBottom: 8 }}>{heading}</span>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

/* ── Node card (flow + steps) ──────────────────────────────────────────────── */

const Card: React.FC<{
  label: string;
  active?: boolean;
  t: number;
  brand: ReturnType<typeof useBrand>;
  u: number;
  fill?: boolean;
}> = ({ label, active, t, brand, u, fill }) => (
  <div
    style={{
      transform: `scale(${0.86 + 0.14 * t})`,
      opacity: t,
      background: active ? brand.colors.accent : brand.colors.bgAlt,
      color: active ? brand.colors.bg : brand.colors.text,
      border: `2px solid ${active ? brand.colors.accent : brand.colors.grid}`,
      borderRadius: 20 * u,
      padding: `${22 * u}px ${30 * u}px`,
      fontFamily: brand.fonts.heading,
      fontSize: 40 * u,
      fontWeight: 700,
      textAlign: "center",
      lineHeight: 1.15,
      boxShadow: active ? `0 12px 40px ${brand.colors.accent}44` : "0 10px 30px rgba(0,0,0,0.35)",
      flex: fill ? 1 : undefined,
      minWidth: fill ? undefined : 160 * u,
    }}
  >
    {label}
  </div>
);

/** Accent arrow that fades in with the node it points to. */
const Arrow: React.FC<{ t: number; brand: ReturnType<typeof useBrand>; u: number; down?: boolean }> = ({
  t,
  brand,
  u,
  down,
}) => (
  <div
    style={{
      opacity: t,
      color: brand.colors.accent,
      fontSize: 52 * u,
      fontWeight: 800,
      lineHeight: 1,
      transform: down ? "none" : `translateX(${-12 * (1 - t)}px)`,
    }}
  >
    {down ? "↓" : "→"}
  </div>
);

/* ── Layouts ───────────────────────────────────────────────────────────────── */

const Flow: React.FC<{
  nodes: DiagramNode[];
  reveal: (i: number) => number;
  brand: ReturnType<typeof useBrand>;
  u: number;
  vertical?: boolean;
}> = ({ nodes, reveal, brand, u, vertical }) => (
  <div
    style={{
      display: "flex",
      flexDirection: vertical ? "column" : "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 22 * u,
      maxWidth: "100%",
    }}
  >
    {nodes.map((node, i) => (
      <div
        key={i}
        style={{ display: "contents" }}
      >
        {i > 0 ? <Arrow t={reveal(i)} brand={brand} u={u} down={vertical} /> : null}
        <Card label={node.label} active={node.active} t={reveal(i)} brand={brand} u={u} />
      </div>
    ))}
  </div>
);

const Steps: React.FC<{
  nodes: DiagramNode[];
  reveal: (i: number) => number;
  brand: ReturnType<typeof useBrand>;
  u: number;
}> = ({ nodes, reveal, brand, u }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 22 * u, width: "100%", maxWidth: 1100 * u }}>
    {nodes.map((node, i) => {
      const t = reveal(i);
      return (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 26 * u,
            opacity: t,
            transform: `translateX(${(1 - t) * -40}px)`,
          }}
        >
          <div
            style={{
              flexShrink: 0,
              width: 64 * u,
              height: 64 * u,
              borderRadius: "50%",
              background: node.active ? brand.colors.accent : brand.colors.bgAlt,
              color: node.active ? brand.colors.bg : brand.colors.accent,
              border: `2px solid ${brand.colors.accent}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: brand.fonts.heading,
              fontSize: 34 * u,
              fontWeight: 800,
            }}
          >
            {i + 1}
          </div>
          <Card label={node.label} active={node.active} t={t} brand={brand} u={u} fill />
        </div>
      );
    })}
  </div>
);

const Stack: React.FC<{
  nodes: DiagramNode[];
  reveal: (i: number) => number;
  brand: ReturnType<typeof useBrand>;
  u: number;
}> = ({ nodes, reveal, brand, u }) => (
  // Bottom-up: column-reverse renders node 0 (the foundation) at the bottom.
  <div
    style={{
      display: "flex",
      flexDirection: "column-reverse",
      gap: 16 * u,
      width: "100%",
      maxWidth: 980 * u,
    }}
  >
    {nodes.map((node, i) => {
      const t = reveal(i);
      return (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 22 * u,
            opacity: t,
            transform: `translateY(${(1 - t) * 28}px)`,
          }}
        >
          <div
            style={{
              flexShrink: 0,
              width: 56 * u,
              textAlign: "right",
              fontFamily: brand.fonts.heading,
              fontSize: 30 * u,
              fontWeight: 700,
              color: brand.colors.textMuted,
            }}
          >
            {String(i + 1).padStart(2, "0")}
          </div>
          <div
            style={{
              flex: 1,
              background: node.active ? brand.colors.accent : brand.colors.bgAlt,
              color: node.active ? brand.colors.bg : brand.colors.text,
              border: `2px solid ${node.active ? brand.colors.accent : brand.colors.grid}`,
              borderRadius: 18 * u,
              padding: `${28 * u}px ${34 * u}px`,
              fontFamily: brand.fonts.heading,
              fontSize: 44 * u,
              fontWeight: 800,
              letterSpacing: -0.5,
              boxShadow: node.active ? `0 12px 40px ${brand.colors.accent}44` : "0 10px 30px rgba(0,0,0,0.35)",
            }}
          >
            {node.label}
          </div>
        </div>
      );
    })}
  </div>
);
