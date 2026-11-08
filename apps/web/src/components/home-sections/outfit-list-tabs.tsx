import type { ReactNode } from 'react';
import styles from './outfit-list.module.css';

interface OutfitListTabsProps {
  /** Unique per section: radios with the same name form one group. */
  groupName: string;
  groupLabel: string;
  tabs: { key: string; label: string; panel: ReactNode }[];
}

/**
 * Tabs without JS: radios + labels switch the panels through `:has()` (see outfit-list.module.css).
 * Every panel is in the HTML; a browser without `:has()` simply shows them all.
 */
export function OutfitListTabs({ groupName, groupLabel, tabs }: OutfitListTabsProps) {
  return (
    <div className={styles.tabs}>
      <div className={styles.tabList} role="radiogroup" aria-label={groupLabel}>
        {tabs.map((tab, index) => {
          const inputId = `${groupName}-${tab.key}`;
          return (
            <span key={tab.key} className={styles.tabItem}>
              <input
                id={inputId}
                type="radio"
                name={groupName}
                className={styles.tabInput}
                defaultChecked={index === 0}
              />
              <label htmlFor={inputId} className={styles.tabLabel}>
                {tab.label}
              </label>
            </span>
          );
        })}
      </div>
      <div className={styles.panels}>
        {tabs.map((tab) => (
          <div key={tab.key} role="group" aria-label={tab.label} className={styles.panel}>
            {tab.panel}
          </div>
        ))}
      </div>
    </div>
  );
}
