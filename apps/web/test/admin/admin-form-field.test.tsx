import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AdminFormField } from '@/components/admin/admin-form-field';
import { issuesToFieldErrors, scopeErrors } from '@/components/admin/validation-messages';
import { createAdminInputSchema, outfitInputSchema } from '@under30ss/shared';

describe('AdminFormField', () => {
  it('wires label, aria-invalid and aria-describedby (hint + error) to the control', () => {
    render(
      <AdminFormField id="f-email" label="Email" hint="Dùng email công ty" error="Email không hợp lệ">
        {(control) => <input {...control} type="email" />}
      </AdminFormField>,
    );
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('id', 'f-email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'f-email-hint f-email-error');
    expect(document.getElementById('f-email-error')).toHaveTextContent('Email không hợp lệ');
    expect(document.getElementById('f-email-hint')).toHaveTextContent('Dùng email công ty');
  });

  it('has no aria-invalid and no error element without an error', () => {
    render(
      <AdminFormField id="f-name" label="Tên">
        {(control) => <input {...control} />}
      </AdminFormField>,
    );
    const input = screen.getByLabelText('Tên');
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(input).not.toHaveAttribute('aria-describedby');
    expect(document.getElementById('f-name-error')).toBeNull();
  });
});

describe('AdminFormField display control', () => {
  it('keeps label and error wiring but never sets aria-invalid or the input class', () => {
    render(
      <>
        <AdminFormField id="f-anchor" label="Điểm" error="Chưa đặt điểm" display>
          {(control) => <output {...control}>Chưa đặt điểm</output>}
        </AdminFormField>
        <AdminFormField id="f-x" label="X">
          {(control) => <input {...control} />}
        </AdminFormField>
      </>,
    );
    const out = screen.getByLabelText('Điểm');
    expect(out).not.toHaveAttribute('aria-invalid');
    expect(out).toHaveAttribute('aria-describedby', 'f-anchor-error');
    expect(document.getElementById('f-anchor-error')).toHaveTextContent('Chưa đặt điểm');
    expect(out.className).not.toBe(screen.getByLabelText('X').className);
  });
});

describe('validation messages', () => {
  it('translates shared schema issues and keys them by dotted path', () => {
    const result = createAdminInputSchema.safeParse({ email: 'nope', password: 'short' });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(issuesToFieldErrors(result.error.issues)).toEqual({
      email: 'Email không hợp lệ',
      password: 'Tối thiểu 8 ký tự',
    });
  });

  it('maps the publish rules to item-level messages', () => {
    const image = { key: 'k', width: 1, height: 1 };
    const item = (id: string, extra: object) => ({
      id,
      name: id,
      image,
      side: 'left' as const,
      order: 0,
      affiliateUrl: 'https://example.com',
      ...extra,
    });
    const result = outfitInputSchema.safeParse({
      slug: 'a',
      title: 'A',
      modelImage: image,
      status: 'published',
      featured: false,
      items: [item('one', { anchor: { x: 1, y: 1 } }), item('two', { affiliateUrl: '' }), item('three', {})],
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(issuesToFieldErrors(result.error.issues)).toEqual({
      'items.1.affiliateUrl': 'Thiếu link affiliate',
      'items.1.anchor': 'Chưa đặt điểm trên người mẫu',
      'items.2.anchor': 'Chưa đặt điểm trên người mẫu',
    });
  });

  it('uses one sentence for a missing or empty value', () => {
    const result = createAdminInputSchema.safeParse({ password: '' });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(issuesToFieldErrors(result.error.issues)).toMatchObject({ email: 'Không được để trống' });
  });

  it('scopes errors to one item', () => {
    expect(scopeErrors({ 'items.1.name': 'a', 'items.2.name': 'b', title: 'c' }, 'items.1.')).toEqual({ name: 'a' });
  });
});
