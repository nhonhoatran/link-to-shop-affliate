import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FileReview } from '../../src/renderer/file-review';
import { bridgeFixture, fileFixture } from './desktop-fixture';

describe('desktop file review', () => {
  const prepare = (approved = false) => {
    const file = fileFixture();
    if (approved) { file.status = 'approved'; file.approvedRevision = file.revision; }
    const onSave = vi.fn().mockResolvedValue(file);
    const onApprove = vi.fn();
    const onDirty = vi.fn();
    const onAnalyze = vi.fn();
    render(<FileReview api={bridgeFixture().api} sessionId="session-a" file={file} busy={false}
      onSave={onSave} onApprove={onApprove} onDirty={onDirty} onAnalyze={onAnalyze} onOpenRemote={vi.fn()} />);
    return { file, onSave, onApprove, onDirty, onAnalyze };
  };

  it('invalidates the visible approval as soon as a field is edited', async () => {
    const { onSave, onDirty } = prepare(true);
    expect(screen.getByText('Đã duyệt phiên bản này')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Tiêu đề outfit'), { target: { value: 'Tiêu đề đã chỉnh' } });
    expect(screen.getByText('Có thay đổi chưa lưu')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Duyệt phiên bản đã lưu' })).toBeDisabled();
    await waitFor(() => expect(onDirty).toHaveBeenLastCalledWith(true));
    await userEvent.click(screen.getByRole('button', { name: 'Lưu bản nháp' }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ title: 'Tiêu đề đã chỉnh' }));
  });

  it('previews the model crop from normalized source coordinates and keeps unknown anchors nullable', () => {
    prepare();
    const preview = screen.getByRole('img', { name: 'Ảnh người mẫu sau crop' });
    expect(preview).toHaveAttribute('viewBox', '30 0 40 100');
    expect(screen.getByRole('button', { name: 'Đặt điểm tại tâm ảnh người mẫu' })).toBeEnabled();
    expect(screen.queryByLabelText('Điểm nối X (%)')).not.toBeInTheDocument();
  });

  it('allows adding and removing an item without assuming a fixed product count', async () => {
    const { onSave } = prepare();
    await userEvent.click(screen.getByRole('button', { name: 'Thêm món' }));
    expect(screen.getByText('Các món trong outfit (2)')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Tên món'), 'Túi vải');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu bản nháp' }));
    expect(onSave.mock.calls[0]?.[0].items).toHaveLength(2);
    expect(onSave.mock.calls[0]?.[0].items[1]).toMatchObject({ name: 'Túi vải', crop: null, sourceAnchor: null });
    await userEvent.click(screen.getByRole('button', { name: 'Xóa món' }));
    expect(screen.getByText('Các món trong outfit (1)')).toBeInTheDocument();
  });

  it('blocks approval for a crop that exceeds the poster and reports the reason', async () => {
    const { onApprove, onSave } = prepare();
    const widths = screen.getAllByLabelText('Rộng (%)');
    fireEvent.change(widths[0]!, { target: { value: '90' } });
    expect(screen.getByRole('button', { name: 'Duyệt phiên bản đã lưu' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Lưu bản nháp' }));
    expect(onSave).not.toHaveBeenCalled();
    expect(onApprove).not.toHaveBeenCalled();
    expect(screen.getByText('Chưa lưu được bản nháp')).toBeInTheDocument();
  });

  it('supports a manual draft and actionable retry when Codex has failed', async () => {
    const file = { ...fileFixture(), draft: null, status: 'error' as const, error: 'Không tìm thấy Codex. Kiểm tra đường dẫn CLI.' };
    const onAnalyze = vi.fn();
    const onSave = vi.fn();
    render(<FileReview api={bridgeFixture().api} sessionId="session-a" file={file} busy={false}
      onSave={onSave} onApprove={vi.fn()} onDirty={vi.fn()} onAnalyze={onAnalyze} onOpenRemote={vi.fn()} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Kiểm tra đường dẫn CLI');
    await userEvent.click(screen.getByRole('button', { name: 'Thử phân tích ảnh này' }));
    expect(onAnalyze).toHaveBeenCalledOnce();
    fireEvent.change(screen.getByLabelText('Tiêu đề outfit'), { target: { value: 'Nhập thủ công' } });
    await userEvent.click(screen.getByRole('button', { name: 'Lưu bản nháp' }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ title: 'Nhập thủ công', modelCrop: null }));
  });

  it.each([
    { status: 'processing' as const, retryOnly: undefined, outfitId: undefined, locked: true },
    { status: 'failed' as const, retryOnly: true, outfitId: undefined, locked: true },
    { status: 'failed' as const, retryOnly: undefined, outfitId: 'c'.repeat(24), locked: true },
    { status: 'failed' as const, retryOnly: undefined, outfitId: undefined, locked: false },
  ])('uses receipt uncertainty to lock editing: $status/$retryOnly/$outfitId', ({ status, retryOnly, outfitId, locked }) => {
    const file = { ...fileFixture(), status: 'error' as const,
      remote: { operationId: 'file-a-r1', payloadHash: 'a'.repeat(64), status, retryOnly, outfitId } };
    render(<FileReview api={bridgeFixture().api} sessionId="session-a" file={file} busy={false} onSave={vi.fn()}
      onApprove={vi.fn()} onDirty={vi.fn()} onAnalyze={vi.fn()} onOpenRemote={vi.fn()} />);
    const field = screen.getByLabelText('Tiêu đề outfit');
    const analyze = screen.getByRole('button', { name: 'Phân tích lại ảnh này' });
    if (locked) { expect(field).toBeDisabled(); expect(analyze).toBeDisabled(); }
    else { expect(field).toBeEnabled(); expect(analyze).toBeEnabled(); }
  });
});
