'use client';

import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import styles from './admin.module.css';
import tabStyles from './editor-tabs.module.css';

export interface EditorTabPanel<Id extends string> {
  id: Id;
  label: string;
  content: ReactNode;
  className?: string | undefined;
}

interface EditorTabsProps<Id extends string> {
  panels: readonly EditorTabPanel<Id>[];
  active: Id;
  onActiveChange: (id: Id) => void;
  errorTabs: ReadonlySet<Id>;
  /** Two-column layout: every panel is visible, so the tab semantics are dropped. */
  wide: boolean;
  label: string;
  panelsClassName?: string;
}

const tabId = (id: string) => `editor-tab-${id}`;
const panelId = (id: string) => `editor-tabpanel-${id}`;

/** Every panel stays mounted (hidden, not removed) so form state, drag and drop and the canvas survive tab changes. */
export function EditorTabs<Id extends string>(props: EditorTabsProps<Id>) {
  const { panels, active, onActiveChange, errorTabs, wide, label, panelsClassName } = props;
  const buttons = useRef(new Map<string, HTMLButtonElement>());

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = panels.length - 1;
    const next =
      event.key === 'ArrowRight' ? (index === last ? 0 : index + 1)
      : event.key === 'ArrowLeft' ? (index === 0 ? last : index - 1)
      : event.key === 'Home' ? 0
      : event.key === 'End' ? last
      : null;
    if (next === null) return;
    event.preventDefault();
    const target = panels[next];
    if (!target) return;
    onActiveChange(target.id);
    buttons.current.get(target.id)?.focus();
  };

  return (
    <div>
      {wide ? null : (
        <div role="tablist" aria-label={label} className={tabStyles.tabList}>
          {panels.map((panel, index) => {
            const selected = panel.id === active;
            return (
              <button
                key={panel.id}
                ref={(node) => {
                  if (node) buttons.current.set(panel.id, node);
                  else buttons.current.delete(panel.id);
                }}
                type="button"
                role="tab"
                id={tabId(panel.id)}
                aria-selected={selected}
                aria-controls={panelId(panel.id)}
                tabIndex={selected ? 0 : -1}
                className={tabStyles.tab}
                onClick={() => onActiveChange(panel.id)}
                onKeyDown={(event) => onKeyDown(event, index)}
              >
                {panel.label}
                {errorTabs.has(panel.id) ? (
                  <>
                    <span className={tabStyles.errorDot} aria-hidden="true" />
                    <span className={styles.srOnly}>{' (có lỗi)'}</span>
                  </>
                ) : null}
              </button>
            );
          })}
        </div>
      )}
      <div className={panelsClassName}>
        {panels.map((panel) => (
          <div
            key={panel.id}
            id={panelId(panel.id)}
            {...(wide ? {} : { role: 'tabpanel', 'aria-labelledby': tabId(panel.id) })}
            hidden={!wide && panel.id !== active}
            className={`${tabStyles.panel} ${panel.className ?? ''}`}
          >
            {panel.content}
          </div>
        ))}
      </div>
    </div>
  );
}
