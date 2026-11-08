'use client';

import { useFormStatus } from 'react-dom';
import buttons from '@/components/public/public-button.module.css';
import { HOME_SECTION_COPY } from './home-section-copy';

interface NewsletterSubmitButtonProps {
  label: string;
  /** True when the form has no action to post to (editor preview). */
  disabled?: boolean;
  className?: string;
}

export function NewsletterSubmitButton({ label, disabled = false, className }: NewsletterSubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={`${buttons.button} ${buttons.primary} ${className ?? ''}`}
      disabled={disabled || pending}
    >
      {pending ? HOME_SECTION_COPY.newsletter.submitting : label}
    </button>
  );
}
