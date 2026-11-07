'use client';

import { X } from 'lucide-react';
import { AnimatePresence, m } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { readMotionTransition } from '@/components/public/read-motion-tokens';
import { DecorativeIcon } from '@/components/ui/decorative-icon';
import { AdminToastContext, type AdminToastApi } from './use-admin-toast';
import styles from './admin-toast.module.css';

type Tone = 'success' | 'error';
interface ToastItem {
  id: number;
  tone: Tone;
  text: string;
}

// Used only when --toast-duration cannot be read (e.g. tests without CSS).
const FALLBACK_DURATION_MS = 4000;

const readToastDuration = (): number => {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--toast-duration').trim();
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value) || value <= 0) return FALLBACK_DURATION_MS;
  if (raw.endsWith('ms')) return value;
  return raw.endsWith('s') ? value * 1000 : FALLBACK_DURATION_MS;
};

const readMotionDistance = (): number => {
  const value = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--motion-distance'));
  return Number.isFinite(value) ? value : 0;
};

const buildMotionProps = (distance: number, transition: ReturnType<typeof readMotionTransition>) => ({
  initial: { opacity: 0, y: distance },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: distance },
  transition,
});

export function AdminToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);
  const [motionProps, setMotionProps] = useState(() => buildMotionProps(0, undefined));

  useEffect(() => setMotionProps(buildMotionProps(readMotionDistance(), readMotionTransition())), []);

  const dismiss = useCallback((id: number) => setToasts((current) => current.filter((toast) => toast.id !== id)), []);

  const push = useCallback(
    (tone: Tone, text: string) => {
      nextId.current += 1;
      const id = nextId.current;
      setToasts((current) => [...current, { id, tone, text }]);
      if (tone === 'success') window.setTimeout(() => dismiss(id), readToastDuration());
    },
    [dismiss],
  );

  const api = useMemo<AdminToastApi>(
    () => ({ success: (text) => push('success', text), error: (text) => push('error', text) }),
    [push],
  );

  const renderTone = (tone: Tone) =>
    toasts
      .filter((toast) => toast.tone === tone)
      .map((toast) => (
        <m.div key={toast.id} className={`${styles.toast} ${styles[tone]}`} {...motionProps}>
          <p className={styles.text}>{toast.text}</p>
          {tone === 'error' ? (
            <button type="button" className={styles.close} aria-label="Đóng thông báo" onClick={() => dismiss(toast.id)}>
              <DecorativeIcon icon={X} size={16} />
            </button>
          ) : null}
        </m.div>
      ));

  return (
    <AdminToastContext.Provider value={api}>
      {children}
      <div className={styles.region}>
        <div role="status" className={styles.live}>
          <AnimatePresence>{renderTone('success')}</AnimatePresence>
        </div>
        <div role="alert" className={styles.live}>
          <AnimatePresence>{renderTone('error')}</AnimatePresence>
        </div>
      </div>
    </AdminToastContext.Provider>
  );
}
