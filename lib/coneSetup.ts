// Cone-set grouping: drills that can run on the same cone layout share a
// setup label, so a coach can set the cones once and chain several drills.
// A drill's explicit `setup` wins; otherwise the label is derived from its
// free-text `area`. Only cleanly-recognised patterns are normalised — a
// one-off setup ("20m square, star of cones") stays its own group.

export function coneSetup(d: { setup?: string; area?: string }): string {
  const explicit = d.setup?.trim();
  if (explicit) return explicit;
  const raw = (d.area ?? "").trim();
  if (!raw) return "Any space";
  const a = raw.toLowerCase();

  if (a === "any" || a === "open") return a === "any" ? "Any space" : "Open space";
  if (a === "small") return "Small space";
  if (a.includes("half pitch") || a.includes("half-pitch")) return "Half pitch";
  if (a.includes("full width") || a.includes("full pitch")) return "Full width";

  // "10m grid", "20m square"
  let m = a.match(/^(\d+)\s*m\s*(grid|square|box)$/);
  if (m) return `${m[1]}m square`;

  // "20m x 15m", "3m x 20m channel", "20m x 15m lane"
  m = a.match(/^(\d+)\s*m?\s*[x×]\s*(\d+)\s*m?\s*(channel|lane|box|grid)?$/);
  if (m) {
    const w = Math.min(Number(m[1]), Number(m[2]));
    const l = Math.max(Number(m[1]), Number(m[2]));
    if (w === l) return `${w}m square`;
    return w <= 5 ? `${w}m × ${l}m channel` : `${w}m × ${l}m box`;
  }

  // a bare distance: "20m" (passing lines etc.)
  m = a.match(/^(\d+)\s*m$/);
  if (m) return `${m[1]}m line`;

  // "5m channel"
  m = a.match(/^(\d+)\s*m\s*channel$/);
  if (m) return `${m[1]}m channel`;

  return raw;
}
