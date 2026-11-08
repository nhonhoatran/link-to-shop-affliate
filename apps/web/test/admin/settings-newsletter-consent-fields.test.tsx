import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_NEWSLETTER_CONSENT } from '@under30ss/shared';
import { SettingsNewsletterConsentFields } from '@/components/admin/settings/settings-newsletter-consent-fields';

const values = { enabled: true, text: DEFAULT_NEWSLETTER_CONSENT.text, privacyHref: '', privacyLabel: '' };

describe('SettingsNewsletterConsentFields', () => {
  it('prefills the default sentence and warns that nothing is saved yet', () => {
    render(<SettingsNewsletterConsentFields values={values} version={null} errors={{}} onChange={vi.fn()} />);
    expect(screen.getByLabelText('Câu đồng ý')).toHaveValue(DEFAULT_NEWSLETTER_CONSENT.text);
    expect(screen.getByText(/Chưa lưu: form đăng ký chưa hiện trên trang chủ/)).toBeInTheDocument();
    expect(screen.queryByText(/Phiên bản hiện tại/)).toBeNull();
  });

  it('keeps the fields visible but disabled while the switch is off', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<SettingsNewsletterConsentFields values={{ ...values, enabled: false }} version={null} errors={{}} onChange={onChange} />);
    expect(screen.getByLabelText('Hiện form đăng ký trên trang chủ')).not.toBeChecked();
    expect(screen.getByLabelText('Câu đồng ý')).toBeDisabled();
    await user.click(screen.getByLabelText('Hiện form đăng ký trên trang chủ'));
    expect(onChange).toHaveBeenCalledWith({ enabled: true });
  });

  it('shows the read-only version once saved', () => {
    render(<SettingsNewsletterConsentFields values={values} version={3} errors={{}} onChange={vi.fn()} />);
    expect(screen.getByText(/Phiên bản hiện tại: 3/)).toBeInTheDocument();
    expect(screen.queryByText(/Chưa lưu/)).toBeNull();
  });

  it('reports edits and shows field errors', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <SettingsNewsletterConsentFields
        values={{ ...values, privacyHref: 'x' }}
        version={1}
        errors={{ 'newsletterConsent.privacyHref': 'Sai link' }}
        onChange={onChange}
      />,
    );
    expect(screen.getByText('Sai link')).toBeInTheDocument();
    await user.type(screen.getByLabelText(/Chữ trên link chính sách/), 'a');
    expect(onChange).toHaveBeenCalledWith({ privacyLabel: 'a' });
  });
});
