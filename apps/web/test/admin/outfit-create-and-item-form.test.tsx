import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ItemEditForm } from '@/components/admin/item-edit-form';
import { OutfitCreateForm } from '@/components/admin/outfit-create-form';
import { fromAdminOutfit } from '@/hooks/admin/editor-state';
import { makeAdminOutfit } from './admin-outfit-fixture';

const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router, usePathname: () => '/admin' }));

beforeEach(() => vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => undefined))));

describe('OutfitCreateForm', () => {
  it('uses the same "Tạo outfit" label as the page title and list button', () => {
    render(<OutfitCreateForm />);
    expect(screen.getByRole('button', { name: 'Tạo outfit' })).toBeInTheDocument();
  });
});

describe('ItemEditForm anchor field', () => {
  it('shows the anchor error as text without marking the output invalid', () => {
    const item = { ...fromAdminOutfit(makeAdminOutfit()).items[0]!, anchor: undefined };
    render(
      <ItemEditForm
        item={item}
        errors={{ anchor: 'Chưa đặt điểm trên người mẫu' }}
        onChange={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    const anchor = screen.getByLabelText('Điểm trên người mẫu');
    expect(anchor.tagName).toBe('OUTPUT');
    expect(anchor).not.toHaveAttribute('aria-invalid');
    expect(anchor).toHaveAttribute('aria-describedby', 'item-anchor-error');
    expect(screen.getByText('Chưa đặt điểm trên người mẫu')).toBeInTheDocument();
  });
});
