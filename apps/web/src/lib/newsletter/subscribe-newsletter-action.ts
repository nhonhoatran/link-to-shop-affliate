'use server';

import { revalidateTag } from 'next/cache';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  API_PATHS,
  MAX_SECTION_ID_LENGTH,
  PUBLIC_CACHE_TAGS,
  newsletterFormSchema,
  type NewsletterResult,
  type NewsletterSubscribeRequest,
} from '@under30ss/shared';
import { ApiError } from '@/lib/api-client-error';
import { apiPost } from '@/lib/api-client-server';
import { newsletterResultHref } from './newsletter-anchor';
import { pickClientIp } from './newsletter-client-ip';

const textField = (formData: FormData, name: string): string | undefined => {
  const value = formData.get(name);
  return typeof value === 'string' ? value : undefined;
};

const sendToApi = async (body: NewsletterSubscribeRequest): Promise<NewsletterResult> => {
  const clientIp = pickClientIp((await headers()).get('x-forwarded-for'));
  try {
    await apiPost(API_PATHS.public.newsletter, body, { headers: clientIp ? { 'x-forwarded-for': clientIp } : {} });
    return 'ok';
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    if (error.status >= 200 && error.status < 300) return 'ok';
    if (error.status === 400) return 'invalid';
    if (error.status === 429) return 'rate';
    // 409: the consent sentence changed after this page was cached; expire it so a reload shows the new one.
    if (error.status === 409) {
      revalidateTag(PUBLIC_CACHE_TAGS.home, { expire: 0 });
      return 'stale';
    }
    // Never log the email or the IP.
    console.error(`Newsletter subscribe failed: status ${error.status}, code ${error.code}`);
    return 'error';
  }
};

interface Outcome {
  result: NewsletterResult;
  sectionId?: string | undefined;
}

const submit = async (formData: FormData): Promise<Outcome> => {
  const rawSectionId = textField(formData, 'sectionId');
  const sectionId = rawSectionId && rawSectionId.length <= MAX_SECTION_ID_LENGTH ? rawSectionId : undefined;
  // A bot filled the hidden field: answer as if it worked, store nothing.
  if (textField(formData, 'website')?.trim()) return { result: 'ok', sectionId };
  const parsed = newsletterFormSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { result: 'invalid', sectionId };
  const { email, consent, consentTextVersion } = parsed.data;
  const result = await sendToApi({ email, consent, consentTextVersion, source: 'home' });
  return { result, sectionId: parsed.data.sectionId };
};

export async function subscribeNewsletter(formData: FormData): Promise<void> {
  let outcome: Outcome;
  try {
    outcome = await submit(formData);
  } catch (error) {
    console.error('Newsletter subscribe crashed', error instanceof Error ? error.name : 'unknown');
    outcome = { result: 'error' };
  }
  // redirect() throws a navigation signal, so it stays outside the try/catch.
  redirect(newsletterResultHref(outcome.result, outcome.sectionId));
}
