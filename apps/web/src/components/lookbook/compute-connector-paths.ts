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
  /** Hotspot centre, relative to the lookbook root. */
  end: { x: number; y: number };
}

export interface ConnectorPath {
  id: string;
  d: string;
}

const round = (n: number): number => Math.round(n * 100) / 100;

/** Quadratic curve from the inner edge of the item image to the hotspot, bowing upward. */
export function computeConnectorPath(input: ConnectorInput, curveRatio: number): ConnectorPath {
  const { image, side, end } = input;
  const sx = side === 'left' ? image.right : image.left;
  const sy = (image.top + image.bottom) / 2;
  const cx = (sx + end.x) / 2;
  const cy = Math.min(sy, end.y) - Math.abs(end.x - sx) * curveRatio;
  return {
    id: input.id,
    d: `M ${round(sx)} ${round(sy)} Q ${round(cx)} ${round(cy)} ${round(end.x)} ${round(end.y)}`,
  };
}

export function computeConnectorPaths(inputs: readonly ConnectorInput[], curveRatio: number): ConnectorPath[] {
  const ratio = Number.isFinite(curveRatio) ? curveRatio : 0;
  return inputs.map((input) => computeConnectorPath(input, ratio));
}
