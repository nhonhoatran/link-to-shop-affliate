'use client';

import { useCallback, useState, type FormEvent } from 'react';
import type { z } from 'zod';
import { describeApiFailure } from '@/components/admin/describe-api-failure';
import { issuesToFieldErrors, type FieldErrors } from '@/components/admin/validation-messages';
import { useRedirectOnUnauthorized } from './use-redirect-on-unauthorized';

interface FormSubmitOptions {
  /** Default true. The login form turns it off: there a 401 means wrong credentials, not an expired session. */
  redirectOnUnauthorized?: boolean;
}

/**
 * Shared submit flow for admin forms: zod check on the client, then the API call;
 * ApiError.fields land on the same fields, anything else becomes the form-level message.
 * A 401 sends the person to the login page, like everywhere else in the admin.
 */
export function useFormSubmit({ redirectOnUnauthorized = true }: FormSubmitOptions = {}) {
  const redirectToLogin = useRedirectOnUnauthorized();
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const handle = useCallback(
    <S extends z.ZodType>(schema: S, getValues: () => unknown, action: (data: z.output<S>) => Promise<void>) =>
      async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setFormError(null);
        const parsed = schema.safeParse(getValues());
        if (!parsed.success) {
          setFieldErrors(issuesToFieldErrors(parsed.error.issues));
          return;
        }
        setFieldErrors({});
        setPending(true);
        try {
          await action(parsed.data);
        } catch (error) {
          if (redirectOnUnauthorized && redirectToLogin(error)) return;
          const failure = describeApiFailure(error);
          setFieldErrors(failure.fields);
          setFormError(failure.message);
        } finally {
          setPending(false);
        }
      },
    [redirectOnUnauthorized, redirectToLogin],
  );

  return { pending, formError, fieldErrors, handle, setFormError };
}
