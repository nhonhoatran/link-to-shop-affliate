import { computeConnectorPaths, type ConnectorInput, type ConnectorPath, type RelativeRect } from './compute-connector-paths';

export interface ConnectorMeasurement {
  paths: ConnectorPath[];
  arrowSize: number;
}

const readNumber = (style: CSSStyleDeclaration, name: string): number =>
  Number.parseFloat(style.getPropertyValue(name)) || 0;

const relativeRect = (rect: DOMRect, origin: DOMRect): RelativeRect => ({
  left: rect.left - origin.left,
  top: rect.top - origin.top,
  right: rect.right - origin.left,
  bottom: rect.bottom - origin.top,
});

/** Reads real card/hotspot geometry from the DOM; all style numbers come from the design tokens. */
export function measureConnectors(root: HTMLElement): ConnectorMeasurement {
  const style = getComputedStyle(root);
  const origin = root.getBoundingClientRect();

  const hotspots = new Map<string, HTMLElement>();
  root.querySelectorAll<HTMLElement>('a[data-hotspot]').forEach((el) => {
    if (el.dataset.itemId) hotspots.set(el.dataset.itemId, el);
  });

  const inputs: ConnectorInput[] = [];
  root.querySelectorAll<HTMLElement>('a[data-item-id]:not([data-hotspot])').forEach((card) => {
    const id = card.dataset.itemId;
    const side = card.closest<HTMLElement>('[data-side]')?.dataset.side;
    const image = card.querySelector<HTMLElement>('[data-item-image]');
    const hotspot = id ? hotspots.get(id) : undefined;
    if (!id || (side !== 'left' && side !== 'right') || !image || !hotspot) return;
    const dot = relativeRect(hotspot.getBoundingClientRect(), origin);
    inputs.push({
      id,
      side,
      image: relativeRect(image.getBoundingClientRect(), origin),
      end: { x: (dot.left + dot.right) / 2, y: (dot.top + dot.bottom) / 2 },
    });
  });

  return {
    paths: computeConnectorPaths(inputs, readNumber(style, '--lookbook-curve-ratio')),
    arrowSize: readNumber(style, '--lookbook-arrow-size'),
  };
}
