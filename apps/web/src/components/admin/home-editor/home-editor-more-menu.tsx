'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import styles from '../admin.module.css';
import { HOME_EDITOR_COPY as COPY } from './home-editor-copy';
import css from './home-editor.module.css';

export interface MoreMenuItem {
  key: string;
  label: string;
  onSelect: () => void;
  disabled?: boolean;
  /** Only listed on narrow screens, where the toolbar has no room for the button. */
  narrowOnly?: boolean;
}

/** Disclosure menu: arrows move between items, Esc closes and returns focus, Tab and outside clicks just close. */
export function HomeEditorMoreMenu({ items }: { items: readonly MoreMenuItem[] }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  const enabledItems = () =>
    Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('button[role="menuitem"]:not(:disabled)') ?? []).filter(
      (button) => !button.parentElement || getComputedStyle(button.parentElement).display !== 'none',
    );

  useEffect(() => {
    if (!open) return;
    enabledItems()[0]?.focus();
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const onKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }
    if (event.key === 'Tab') {
      setOpen(false);
      return;
    }
    const buttons = enabledItems();
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next =
      event.key === 'ArrowDown' ? (current + 1) % buttons.length
      : event.key === 'ArrowUp' ? (current - 1 + buttons.length) % buttons.length
      : event.key === 'Home' ? 0
      : event.key === 'End' ? buttons.length - 1
      : null;
    if (next === null) return;
    event.preventDefault();
    buttons[next]?.focus();
  };

  return (
    <div ref={rootRef} className={css.menuRoot}>
      <button
        ref={triggerRef}
        type="button"
        className={`${styles.btn} ${styles.btnSecondary}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {COPY.more}
      </button>
      {open ? (
        <ul ref={menuRef} role="menu" aria-label={COPY.moreLabel} className={css.menu} onKeyDown={onKeyDown}>
          {items.map((item) => (
            <li key={item.key} role="none" className={item.narrowOnly ? css.narrowOnly : undefined}>
              <button
                type="button"
                role="menuitem"
                className={css.menuItem}
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false);
                  triggerRef.current?.focus();
                  item.onSelect();
                }}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
