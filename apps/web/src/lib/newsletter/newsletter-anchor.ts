import { NEWSLETTER_RESULT_PARAM, type NewsletterResult } from '@under30ss/shared';

/** Element id of the result message; also the hash the post/redirect/get response points at. */
export const newsletterAnchorId = (sectionId: string): string => `newsletter-${sectionId}`;

export const newsletterResultHref = (result: NewsletterResult, sectionId?: string): string => {
  const hash = sectionId ? `#${encodeURIComponent(newsletterAnchorId(sectionId))}` : '';
  return `/?${NEWSLETTER_RESULT_PARAM}=${result}${hash}`;
};
