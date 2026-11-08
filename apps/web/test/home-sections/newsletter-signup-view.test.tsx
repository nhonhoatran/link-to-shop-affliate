import { render, screen } from '@testing-library/react';
import { sampleNewsletterConsent, sampleResolvedEditorialSections } from '@under30ss/shared/fixtures';
import type { HomeSectionOf, NewsletterConsentDto, NewsletterResult } from '@under30ss/shared';
import { describe, expect, it, vi } from 'vitest';
import { NewsletterSignupView } from '@/components/home-sections/newsletter-signup-view';
import type { NewsletterFormState, SectionMode } from '@/components/home-sections/section-shell';

type NewsletterSection = HomeSectionOf<'NewsletterSignup'> & { data: { consent: NewsletterConsentDto } };

const base = sampleResolvedEditorialSections.find((s): s is NewsletterSection => s.type === 'NewsletterSignup');
if (!base) throw new Error('fixture missing NewsletterSignup');

const action = vi.fn();

interface RenderOptions {
  mode?: SectionMode;
  newsletter?: NewsletterFormState;
  props?: Partial<NewsletterSection['props']>;
}

const renderForm = ({ mode = 'public', newsletter = { action }, props = {} }: RenderOptions = {}) =>
  render(
    <NewsletterSignupView
      section={{ ...base, props: { ...base.props, ...props } }}
      headingId="section-newsletter"
      priority={false}
      siteUrl="https://shop.example.test"
      mode={mode}
      newsletter={newsletter}
    />,
  );

describe('NewsletterSignupView', () => {
  it('has a visible email label, a required email field and an unticked required consent checkbox', () => {
    renderForm();
    const email = screen.getByLabelText('Email');
    expect(email).toHaveAttribute('type', 'email');
    expect(email).toBeRequired();
    expect(email).toHaveAttribute('autocomplete', 'email');
    const consent = screen.getByRole('checkbox');
    expect(consent).not.toBeChecked();
    expect(consent).toBeRequired();
    expect(consent.closest('label')).toHaveTextContent(sampleNewsletterConsent.text);
  });

  it('does not switch off native validation, so errors show at the field without JS', () => {
    const { container } = renderForm();
    expect(container.querySelector('form')).not.toHaveAttribute('novalidate');
  });

  it('posts the section id and the consent version with the form', () => {
    const { container } = renderForm();
    expect(container.querySelector('input[name="sectionId"]')).toHaveValue(base.props.id);
    expect(container.querySelector('input[name="consentTextVersion"]')).toHaveValue(String(sampleNewsletterConsent.version));
  });

  it('keeps the honeypot out of reach of people and screen readers', () => {
    const { container } = renderForm();
    const trap = container.querySelector<HTMLInputElement>('input[name="website"]');
    expect(trap).toHaveAttribute('tabindex', '-1');
    expect(trap).toHaveAttribute('autocomplete', 'off');
    expect(trap?.closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it('links the privacy policy when the consent has a link', () => {
    renderForm();
    const link = screen.getByRole('link', { name: sampleNewsletterConsent.privacyLabel });
    expect(link).toHaveAttribute('href', sampleNewsletterConsent.privacyHref);
  });

  it('has a polite status region that stays empty until a result arrives', () => {
    const { container } = renderForm();
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveAttribute('id', `newsletter-${base.props.id}`);
    expect(status).toBeEmptyDOMElement();
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  it('shows the section success message on ok', () => {
    renderForm({ newsletter: { action, result: 'ok' } });
    expect(screen.getByRole('status')).toHaveTextContent(base.props.successMessage!);
  });

  it('falls back to the default success sentence when the message is blank', () => {
    renderForm({ newsletter: { action, result: 'ok' }, props: { successMessage: '  ' } });
    expect(screen.getByRole('status')).toHaveTextContent('Cảm ơn bạn đã đăng ký');
  });

  it.each([
    ['invalid', /chưa hợp lệ/],
    ['rate', /quá nhanh/],
    ['stale', /tải lại trang/],
    ['error', /Chưa đăng ký được/],
  ] as [NewsletterResult, RegExp][])('shows the %s message', (result, pattern) => {
    renderForm({ newsletter: { action, result } });
    expect(screen.getByRole('status')).toHaveTextContent(pattern);
  });

  it('is inert in the editor preview: no action, disabled button, a note and no result', () => {
    const { container } = renderForm({ mode: 'preview', newsletter: { action, result: 'ok' } });
    expect(container.querySelector('form')).not.toHaveAttribute('action');
    expect(screen.getByRole('button', { name: base.props.buttonLabel })).toBeDisabled();
    expect(screen.getByText('Xem trước, không gửi')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('is inert when the page passes no action', () => {
    renderForm({ newsletter: {} });
    expect(screen.getByRole('button', { name: base.props.buttonLabel })).toBeDisabled();
  });
});
