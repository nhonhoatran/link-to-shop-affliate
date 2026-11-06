'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { measureConnectors, type ConnectorMeasurement } from './measure-connectors';
import { observeLookbookChanges } from './observe-lookbook-changes';
import styles from './lookbook.module.css';

const ROOT_SELECTOR = '[data-lookbook]';
const LINK_SELECTOR = 'a[data-item-id]';

const itemIdOf = (node: EventTarget | null): string | null =>
  node instanceof Element ? (node.closest<HTMLElement>('[data-item-id]')?.dataset.itemId ?? null) : null;

const supportsHover = (): boolean =>
  typeof window.matchMedia !== 'function' || window.matchMedia('(hover: hover)').matches;

const isKeyboardFocus = (el: EventTarget | null): boolean => {
  if (!(el instanceof Element)) return false;
  try {
    return el.matches(':focus-visible');
  } catch {
    return true;
  }
};

/** Draws the connector threads and drives the two-way card/hotspot highlight. Renders only the SVG overlay. */
export function LookbookInteractions() {
  const svgRef = useRef<SVGSVGElement>(null);
  const markerId = `lookbook-arrow-${useId().replace(/:/g, '')}`;
  const [measurement, setMeasurement] = useState<ConnectorMeasurement>({ paths: [], arrowSize: 0 });
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const activeId = hoverId ?? focusId;

  const getRoot = useCallback(() => svgRef.current?.closest<HTMLElement>(ROOT_SELECTOR) ?? null, []);

  useEffect(() => {
    const root = getRoot();
    if (!root) return;
    const measure = () => {
      const next = measureConnectors(root);
      setMeasurement((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
    };
    measure();
    const stopObserving = observeLookbookChanges(root, svgRef.current, measure);

    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(root);
    root.addEventListener('load', measure, true);
    let cancelled = false;
    void document.fonts?.ready.then(() => {
      if (!cancelled) measure();
    });

    return () => {
      cancelled = true;
      stopObserving();
      observer?.disconnect();
      root.removeEventListener('load', measure, true);
    };
  }, [getRoot]);

  useEffect(() => {
    const root = getRoot();
    if (!root) return;

    const onOver = (e: PointerEvent) => {
      if (e.pointerType === 'touch' || !supportsHover()) return;
      setHoverId(itemIdOf(e.target));
    };
    const onOut = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      setHoverId(itemIdOf(e.relatedTarget));
    };
    const onFocusIn = (e: FocusEvent) => {
      if (isKeyboardFocus(e.target)) setFocusId(itemIdOf(e.target));
    };
    const onFocusOut = () => setFocusId(null);
    const onClick = (e: MouseEvent) => {
      if (e.target instanceof Element && e.target.closest('[aria-disabled="true"]')) e.preventDefault();
    };

    root.addEventListener('pointerover', onOver);
    root.addEventListener('pointerout', onOut);
    root.addEventListener('focusin', onFocusIn);
    root.addEventListener('focusout', onFocusOut);
    root.addEventListener('click', onClick);
    return () => {
      root.removeEventListener('pointerover', onOver);
      root.removeEventListener('pointerout', onOut);
      root.removeEventListener('focusin', onFocusIn);
      root.removeEventListener('focusout', onFocusOut);
      root.removeEventListener('click', onClick);
    };
  }, [getRoot]);

  useEffect(() => {
    const root = getRoot();
    if (!root) return;
    if (activeId) root.dataset.activeId = activeId;
    else delete root.dataset.activeId;
    root.querySelectorAll<HTMLElement>(LINK_SELECTOR).forEach((el) => {
      if (el.dataset.itemId === activeId) el.dataset.active = '';
      else delete el.dataset.active;
    });
  }, [activeId, getRoot]);

  const { paths, arrowSize } = measurement;
  return (
    <svg ref={svgRef} className={styles.connectors} aria-hidden="true" focusable="false">
      <defs>
        <marker
          id={markerId}
          markerUnits="userSpaceOnUse"
          markerWidth={arrowSize}
          markerHeight={arrowSize}
          refX={arrowSize}
          refY={arrowSize / 2}
          orient="auto"
        >
          <path d={`M 0 0 L ${arrowSize} ${arrowSize / 2} L 0 ${arrowSize} Z`} className={styles.arrow} />
        </marker>
      </defs>
      {paths.map((p) => (
        <path
          key={p.id}
          d={p.d}
          className={styles.connector}
          data-item-id={p.id}
          data-active={p.id === activeId ? '' : undefined}
          markerEnd={`url(#${markerId})`}
        />
      ))}
    </svg>
  );
}
