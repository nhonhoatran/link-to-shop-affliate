import { MAX_EMAIL_LENGTH, type HomeSectionOf, type NewsletterConsentDto, type NewsletterResult } from '@under30ss/shared';
import { PublicSmartLink } from '@/components/public/public-smart-link';
import { newsletterAnchorId } from '@/lib/newsletter/newsletter-anchor';
import { HOME_SECTION_COPY } from './home-section-copy';
import { NewsletterStatusMessage } from './newsletter-status-message';
import { NewsletterSubmitButton } from './newsletter-submit-button';
import { SectionEyebrow, SectionShell, srOnlyClass, type SectionViewProps } from './section-shell';
import styles from './newsletter-signup.module.css';

type NewsletterSection = HomeSectionOf<'NewsletterSignup'> & { data: { consent: NewsletterConsentDto } };

const resultMessage = (result: NewsletterResult | undefined, successMessage: string | undefined): string => {
  if (!result) return '';
  if (result === 'ok') return successMessage?.trim() || HOME_SECTION_COPY.newsletter.successDefault;
  return HOME_SECTION_COPY.newsletter.failure[result];
};

export function NewsletterSignupView({ section, headingId, mode, newsletter }: SectionViewProps<NewsletterSection>) {
  const { id, eyebrow, heading, body, buttonLabel, successMessage, finePrint } = section.props;
  const { consent } = section.data;
  const action = mode === 'public' ? newsletter?.action : undefined;
  const result = mode === 'public' ? newsletter?.result : undefined;
  const emailId = `newsletter-email-${id}`;
  const anchorId = newsletterAnchorId(id);
  return (
    <SectionShell sectionId={id} headingId={headingId} labelledBy={headingId}>
      <div className={styles.box}>
        {eyebrow ? <SectionEyebrow>{eyebrow}</SectionEyebrow> : null}
        <h2 id={headingId} className={styles.heading}>{heading}</h2>
        {body ? <p className={styles.body}>{body}</p> : null}
        <form action={action} className={styles.form}>
          <input type="hidden" name="sectionId" value={id} />
          <input type="hidden" name="consentTextVersion" value={consent.version} />
          <div className={srOnlyClass} aria-hidden="true">
            <label>
              {HOME_SECTION_COPY.newsletter.honeypotLabel}
              <input type="text" name="website" tabIndex={-1} autoComplete="off" />
            </label>
          </div>
          <div className={styles.field}>
            <label htmlFor={emailId} className={styles.label}>
              {HOME_SECTION_COPY.newsletter.emailLabel}
            </label>
            <input
              id={emailId}
              type="email"
              name="email"
              className={styles.input}
              autoComplete="email"
              inputMode="email"
              maxLength={MAX_EMAIL_LENGTH}
              aria-describedby={result === 'invalid' ? anchorId : undefined}
              required
            />
          </div>
          <label className={styles.consent}>
            <input type="checkbox" name="consent" className={styles.checkbox} required />
            <span>
              {consent.text}
              {consent.privacyHref ? (
                <>
                  {' '}
                  <PublicSmartLink href={consent.privacyHref} newTab className={styles.privacyLink}>
                    {consent.privacyLabel}
                  </PublicSmartLink>
                </>
              ) : null}
            </span>
          </label>
          <NewsletterSubmitButton label={buttonLabel} disabled={!action} className={styles.submit} />
          <NewsletterStatusMessage
            id={anchorId}
            className={styles.status}
            result={result}
            message={resultMessage(result, successMessage)}
          />
          {!action ? <p className={styles.note}>{HOME_SECTION_COPY.newsletter.previewNote}</p> : null}
        </form>
        {finePrint ? <p className={styles.finePrint}>{finePrint}</p> : null}
      </div>
    </SectionShell>
  );
}
