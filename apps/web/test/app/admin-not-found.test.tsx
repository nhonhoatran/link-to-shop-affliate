import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AdminNotFound from '@/app/admin/(protected)/not-found';

describe('AdminNotFound', () => {
  it('renders an admin panel with one h1 and a link back to the outfit list, without the public shell', () => {
    render(<AdminNotFound />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Về danh sách outfit' })).toHaveAttribute('href', '/admin/outfits');
    expect(screen.queryByRole('main')).not.toBeInTheDocument();
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
  });
});
