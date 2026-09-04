import type { MovementDiagram } from "./types";
import { MAT_DIAGRAMS } from "./mat";
import { REFORMER_DIAGRAMS } from "./reformer";
import { BARRE_DIAGRAMS } from "./barre";

export * from "./types";
export { diagramSvg, diagramCss, DIAGRAM_W, DIAGRAM_H } from "./poseSvg";

/** Diagram for every seed movement, keyed by movement id. */
export const DIAGRAMS: Record<string, MovementDiagram> = {
  ...MAT_DIAGRAMS,
  ...REFORMER_DIAGRAMS,
  ...BARRE_DIAGRAMS,
};

/** Instructor copies carry `diagramId` pointing at the seed they came from. */
export function diagramFor(m: { id: string; diagramId?: string }): MovementDiagram | undefined {
  return DIAGRAMS[m.diagramId ?? m.id];
}
