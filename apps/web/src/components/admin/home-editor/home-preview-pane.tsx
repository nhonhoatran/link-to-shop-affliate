'use client';

import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { HomeSectionList } from '@/components/home-sections/home-section-list';
import styles from '../admin.module.css';
import { AdminPanel } from '../admin-panel';
import { FormError } from '../field-error';
import type { HomeSection } from '@under30ss/shared';
import { HOME_EDITOR_COPY as COPY } from './home-editor-copy';
import css from './home-preview-pane.module.css';
import { useSectionPreviewData } from './use-section-preview-data';

type Width = 'desktop' | 'mobile';

interface HomePreviewPaneProps {
  content: readonly HomeSection[];
  /** Two-column layout: the pane is beside the editor, so it starts in desktop width. */
  wide: boolean;
  siteUrl: string;
  onSelectSection: (id: string) => void;
}

export function HomePreviewPane({ content, wide, siteUrl, onSelectSection }: HomePreviewPaneProps) {
  const [chosen, setChosen] = useState<Width | null>(null);
  const width: Width = chosen ?? (wide ? 'desktop' : 'mobile');
  const { sections, status } = useSectionPreviewData(content);
  const holderRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);

  // Section layouts follow the real window, so the desktop frame is laid out at full width and shrunk to fit the pane.
  useEffect(() => {
    const holder = holderRef.current;
    if (!holder || width !== 'desktop' || typeof ResizeObserver === 'undefined') {
      setZoom(1);
      return;
    }
    const fullWidth = Number.parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--admin-preview-desktop-width'),
    );
    const sync = () => setZoom(fullWidth > 0 ? Math.min(1, holder.clientWidth / fullWidth) : 1);
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(holder);
    return () => observer.disconnect();
  }, [width]);

  const onClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('a')) event.preventDefault();
    const id = target.closest('[data-section-id]')?.getAttribute('data-section-id');
    if (id) onSelectSection(id);
  };

  return (
    <AdminPanel
      id="home-preview"
      title={COPY.previewPanel}
      actions={
        <div role="group" aria-label={COPY.previewSizeLabel} className={styles.btnGroup}>
          {(['desktop', 'mobile'] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={width === value}
              className={`${styles.btn} ${styles.btnSecondary} ${styles.btnToggle}`}
              onClick={() => setChosen(value)}
            >
              {value === 'desktop' ? COPY.previewDesktop : COPY.previewMobile}
            </button>
          ))}
        </div>
      }
    >
      <FormError tone="warning" message={status === 'error' ? COPY.previewStale : null} />
      {status === 'loading' ? <p className={styles.hint}>{COPY.previewUpdating}</p> : null}
      <div ref={holderRef}>
        {sections.length === 0 ? (
          <p className={styles.hint}>{COPY.previewEmpty}</p>
        ) : (
          <div
            className={`${css.frame} ${width === 'mobile' ? css.mobile : css.desktop}`}
            style={width === 'desktop' ? { zoom } : undefined}
            onClickCapture={onClickCapture}
          >
            <HomeSectionList sections={sections} siteUrl={siteUrl} seoTitle={COPY.title} mode="preview" />
          </div>
        )}
      </div>
    </AdminPanel>
  );
}
