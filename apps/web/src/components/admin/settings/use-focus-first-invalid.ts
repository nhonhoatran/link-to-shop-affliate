'use client';

import { useEffect, type RefObject } from 'react';

/** Moves focus to the first control marked invalid whenever a new set of errors arrives. */
export function useFocusFirstInvalid(formRef: RefObject<HTMLFormElement | null>, errors: object): void {
  useEffect(() => {
    if (Object.keys(errors).length === 0) return;
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [errors, formRef]);
}
