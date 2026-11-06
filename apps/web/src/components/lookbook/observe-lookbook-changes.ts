/**
 * Calls `onChange` (at most once per frame) when the lookbook DOM changes in a way that moves
 * cards or hotspots: item added/removed/reordered, or a hotspot's inline position changed.
 * Mutations inside `ignore` (the connector SVG itself) are skipped, otherwise drawing would retrigger itself.
 */
export function observeLookbookChanges(root: HTMLElement, ignore: Node | null, onChange: () => void): () => void {
  if (typeof MutationObserver === 'undefined') return () => undefined;
  let frame = 0;
  const schedule = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      onChange();
    });
  };
  const observer = new MutationObserver((records) => {
    if (records.some((record) => !ignore?.contains(record.target))) schedule();
  });
  observer.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['style'] });
  return () => {
    observer.disconnect();
    if (frame) cancelAnimationFrame(frame);
  };
}
