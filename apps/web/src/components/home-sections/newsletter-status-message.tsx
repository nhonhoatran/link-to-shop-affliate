'use client';

import { useEffect, useRef } from 'react';
import type { NewsletterResult } from '@under30ss/shared';

interface NewsletterStatusMessageProps {
  id: string;
  result: NewsletterResult | undefined;
  message: string;
  className?: string;
}

/** The result arrives with the page (post/redirect/get), so moving focus here is what makes a screen reader announce it. */
export function NewsletterStatusMessage({ id, result, message, className }: NewsletterStatusMessageProps) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (result) ref.current?.focus();
  }, [result]);
  return (
    <p ref={ref} id={id} className={className} role="status" aria-live="polite" tabIndex={-1} data-result={result}>
      {message}
    </p>
  );
}
