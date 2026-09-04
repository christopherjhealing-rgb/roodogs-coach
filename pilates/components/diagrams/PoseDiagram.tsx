import { diagramSvg, diagramFor, type MovementDiagram } from "@/lib/diagrams";

/**
 * Renders a movement's stick-figure diagram. Static on lists (cheap), animated
 * on detail and teach screens. Colours come from the CSS variables set by
 * the surface it sits on (.card = ink figure, .card-dark / page = mint).
 */
export default function PoseDiagram({
  movement,
  diagram,
  animate = false,
  className = "",
}: {
  movement?: { id: string; name?: string; diagramId?: string };
  diagram?: MovementDiagram;
  animate?: boolean;
  className?: string;
}) {
  const d = diagram ?? (movement ? diagramFor(movement) : undefined);
  if (!d) return null;
  const html = diagramSvg(animate ? d : { ...d, frames: [d.frames[0]] }, { animate, title: movement?.name });
  return <div className={`pose-wrap ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
}
