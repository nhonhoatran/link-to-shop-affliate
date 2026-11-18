import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SyncPanel } from '../../src/renderer/sync-panel';
import { sessionFixture, settingsFixture } from './desktop-fixture';

describe('desktop synchronization review', () => {
  it('does not allow an unapproved session to synchronize', () => {
    render(<SyncPanel session={sessionFixture()} settings={settingsFixture()} busy={false} onSync={vi.fn()} onReview={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Đồng bộ mục đã duyệt' })).toBeDisabled();
    expect(screen.getByText('Chưa có bản nháp đã duyệt để gửi.')).toBeInTheDocument();
  });

  it('keeps a session bound to its original destination and blocks another website', () => {
    const session = { ...sessionFixture(), destinationOrigin: 'https://original.example' };
    session.counts.approved = 1;
    render(<SyncPanel session={session} settings={settingsFixture()} busy={false} onSync={vi.fn()} onReview={vi.fn()} />);
    expect(screen.getByRole('alert')).toHaveTextContent('https://original.example');
    expect(screen.getByRole('button', { name: 'Đồng bộ mục đã duyệt' })).toBeDisabled();
  });

  it('offers retry for approved work after a partial failure', async () => {
    const session = sessionFixture();
    session.counts = { total: 3, analyzed: 3, approved: 2, synced: 1, failed: 1 };
    const sync = vi.fn();
    render(<SyncPanel session={session} settings={settingsFixture()} busy={false} onSync={sync} onReview={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Thử đồng bộ lại mục đã duyệt' }));
    expect(sync).toHaveBeenCalledOnce();
  });

  it('keeps one remaining approval sendable after multiple items already synchronized', () => {
    const session = sessionFixture();
    session.counts = { total: 3, analyzed: 3, approved: 1, synced: 2, failed: 0 };
    render(<SyncPanel session={session} settings={settingsFixture()} busy={false} onSync={vi.fn()} onReview={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Đồng bộ mục đã duyệt' })).toBeEnabled();
  });
});
