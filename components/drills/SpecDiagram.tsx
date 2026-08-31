"use client";

import type { CSSProperties } from "react";
import DrillDiagram from "./DrillDiagram";

// The library diagrams inherit their main colour from `currentColor` and read
// accents from CSS variables. This wrapper paints them in the Roodogs palette:
// attackers/runs/grid in seal green, cones/passes in brass-orange, defenders
// in red.
const THEME = {
  color: "#1E5B3C",
  "--drill-accent": "#D3571B",
  "--drill-def": "#C8102E",
  "--drill-ball": "#8B5A2B",
  "--drill-turf": "#2F6B3A",
  "--drill-muted": "#5B6878",
  "--drill-surface": "#ffffff",
} as CSSProperties;

/** A themed drill diagram from a library spec string. */
export default function SpecDiagram({
  spec,
  name,
  animate = true,
  className,
}: {
  spec: string;
  name: string;
  animate?: boolean;
  className?: string;
}) {
  return (
    <div style={THEME} className={className}>
      <DrillDiagram spec={spec} name={name} animate={animate} />
    </div>
  );
}
