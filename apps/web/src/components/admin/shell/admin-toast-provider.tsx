'use client';

import { X } from 'lucide-react';
import { AnimatePresence, m } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { readMotionTransition } from '@/components/public/read-motion-tokens';
import { DecorativeIcon } from '@/components/ui/decorative-icon';
import {
  AdminToastContext,
  type AdminToastAction,
  type AdminToastApi,
  type AdminToastOptions,
} from './use-admin-toast';
import styles from './admin-toast.module.css';

type Tone = 'success' | 'error';
interface ToastItem {
  id: number;
  tone: Tone;
  text: string;
  action?: AdminToastAction | undefined;
}

// Used only when the CSS duration tokens cannot be read (e.g. tests without CSS).
const FALLBACK_DURATION_MS = 4000;
const FALLBACK_ACTION_DURATION_MS = 10000;

const readDuration = (property: string, fallback: number): number => {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(property).trim();
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value) || value <= 0) return fallback;
  if (raw.endsWith('ms')) return value;
  return raw.endsWith('s') ? value * 1000 : fallback;
};

/** WCAG 2.2.1: the countdown stops while the pointer or keyboard focus is on the toast and restarts when it leaves. */
function ActionToast({ toast, className, motionProps, onDismiss }: ToastViewProps) {
  const timer = useRef<number | undefined>(undefined);
  const dismissRef = useRef(onDismiss);
  useEffect(() => {
    dismissRef.current = onDismiss;
  });
  const start = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(
      () => dismissRef.current(),
      readDuration('--toast-action-duration', FALLBACK_ACTION_DURATION_MS),
    );
  }, []);
  const stop = useCallback(() => window.clearTimeout(timer.current), []);

  useEffect(() => {
    start();
    return stop;
  }, [start, stop]);

  const { action } = toast;
  return (
    <m.div
      className={className}
      {...motionProps}
      onMouseEnter={stop}
      onMouseLeave={start}
      onFocusCapture={stop}
      onBlurCapture={start}
    >
      <p className={styles.text}>{toast.text}</p>
      {action ? (
        <button
          type="button"
          className={styles.action}
          onClick={() => {
            action.onClick();
            onDismiss();
          }}
        >
          {action.label}
        </button>
      ) : null}
    </m.div>
  );
}

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

interface ToastViewProps {
  toast: ToastItem;
  className: string;
  motionProps: ReturnType<typeof buildMotionProps>;
  onDismiss: () => void;
}

export function AdminToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);
  const [motionProps, setMotionProps] = useState(() => buildMotionProps(0, undefined));

  useEffect(() => setMotionProps(buildMotionProps(readMotionDistance(), readMotionTransition())), []);

  const dismiss = useCallback((id: number) => setToasts((current) => current.filter((toast) => toast.id !== id)), []);

  const push = useCallback(
    (tone: Tone, text: string, options?: AdminToastOptions) => {
      nextId.current += 1;
      const id = nextId.current;
      setToasts((current) => [...current, { id, tone, text, action: options?.action }]);
      // Action toasts run their own pausable timer (ActionToast).
      if (tone === 'success' && !options?.action) {
        window.setTimeout(() => dismiss(id), readDuration('--toast-duration', FALLBACK_DURATION_MS));
      }
    },
    [dismiss],
  );

  const api = useMemo<AdminToastApi>(
    () => ({
      success: (text, options) => push('success', text, options),
      error: (text) => push('error', text),
    }),
    [push],
  );

  const renderTone = (tone: Tone) =>
    toasts
      .filter((toast) => toast.tone === tone)
      .map((toast) =>
        toast.action ? (
          <ActionToast
            key={toast.id}
            toast={toast}
            className={`${styles.toast} ${styles[tone]}`}
            motionProps={motionProps}
            onDismiss={() => dismiss(toast.id)}
          />
        ) : (
          <m.div key={toast.id} className={`${styles.toast} ${styles[tone]}`} {...motionProps}>
            <p className={styles.text}>{toast.text}</p>
            {tone === 'error' ? (
              <button
                type="button"
                className={styles.close}
                aria-label="Đóng thông báo"
                onClick={() => dismiss(toast.id)}
              >
                <DecorativeIcon icon={X} size={16} />
              </button>
            ) : null}
          </m.div>
        ),
      );

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
