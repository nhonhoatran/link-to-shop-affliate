import { DEFAULT_PRIVACY_LABEL, type NewsletterConsentDto, type NewsletterConsentInput } from '@under30ss/shared';
import { SettingsModel, type SettingsDoc } from '../models/settings-model';

type StoredConsent = Pick<SettingsDoc, 'newsletterConsent' | 'newsletterConsentVersion'>;

/** Null until an admin has saved a sentence, so the shared default never switches the signup form on by itself. */
export const toSavedConsent = (stored: StoredConsent | null): NewsletterConsentDto | null => {
  const consent = stored?.newsletterConsent;
  const version = stored?.newsletterConsentVersion;
  if (!consent || !version) return null;
  return {
    text: consent.text,
    version,
    ...(consent.privacyHref ? { privacyHref: consent.privacyHref } : {}),
    privacyLabel: consent.privacyLabel ?? DEFAULT_PRIVACY_LABEL,
  };
};

export const getSavedConsent = async (): Promise<NewsletterConsentDto | null> =>
  toSavedConsent(await SettingsModel.findOne({ singleton: 'site' }).lean<StoredConsent>());

/**
 * The version moves only when the sentence or the link changes. The comparison and the increment happen in one
 * conditional update, so two concurrent saves of the same new text bump the version once.
 */
export const saveConsent = async (consent: NewsletterConsentInput): Promise<void> => {
  const hrefChanged = consent.privacyHref
    ? { 'newsletterConsent.privacyHref': { $ne: consent.privacyHref } }
    : { 'newsletterConsent.privacyHref': { $exists: true } };
  const bumped = await SettingsModel.updateOne(
    { singleton: 'site', $or: [{ 'newsletterConsent.text': { $ne: consent.text } }, hrefChanged] },
    { $set: { newsletterConsent: consent }, $inc: { newsletterConsentVersion: 1 } },
  );
  if (bumped.matchedCount > 0) return;
  // Same sentence and link: only the link label may differ, which is not worth a new version.
  await SettingsModel.updateOne({ singleton: 'site', 'newsletterConsent.text': consent.text }, { $set: { newsletterConsent: consent } });
};
