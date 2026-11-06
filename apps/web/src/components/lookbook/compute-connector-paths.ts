export type ConnectorSide = 'left' | 'right';

/** Rect relative to the lookbook root, in CSS px. */
export interface RelativeRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface ConnectorInput {
  id: string;
  side: ConnectorSide;
  image: RelativeRect;
  /** Anchor point on the model (hotspot centre), relative to the lookbook root. */
  end: { x: number; y: number };
}

export interface ConnectorPath {
  id: string;
  d: string;
}

const round = (n: number): number => Math.round(n * 100) / 100;

/**
 * Cubic curve from the inner edge of the item image to the anchor. It leaves the item horizontally
 * and bends toward the anchor, so it curves down for a lower anchor and up for a higher one.
 * `curveRatio` is the share of the horizontal span used for both handles (about 0.1 to 0.5).
 */
export function computeConnectorPath(input: ConnectorInput, curveRatio: number): ConnectorPath {
  const { image, side, end } = input;
  const sx = side === 'left' ? image.right : image.left;
  const sy = (image.top + image.bottom) / 2;
  const dx = end.x - sx;
  const dy = end.y - sy;
  const c1x = sx + dx * curveRatio;
  const c2x = end.x - dx * curveRatio;
  const c2y = end.y - dy * curveRatio;
  const pts = [sx, sy, c1x, sy, c2x, c2y, end.x, end.y].map(round);
  return { id: input.id, d: `M ${pts[0]} ${pts[1]} C ${pts[2]} ${pts[3]} ${pts[4]} ${pts[5]} ${pts[6]} ${pts[7]}` };
}

export function computeConnectorPaths(inputs: readonly ConnectorInput[], curveRatio: number): ConnectorPath[] {
  const ratio = Number.isFinite(curveRatio) ? curveRatio : 0;
  return inputs.map((input) => computeConnectorPath(input, ratio));
}
