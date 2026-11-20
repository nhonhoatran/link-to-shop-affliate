import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DesktopApp } from '../../src/renderer/desktop-app';
import { bridgeFixture } from './desktop-fixture';

afterEach(() => vi.restoreAllMocks());

const openSession = async () => {
  await userEvent.click(await screen.findByRole('button', { name: /Phiên thử nghiệm/ }));
  await screen.findByRole('button', { name: /look-a.png/ });
};
const openFile = async () => {
  await openSession();
  await userEvent.click(screen.getByRole('button', { name: /look-a.png/ }));
  await screen.findByLabelText('Tiêu đề outfit');
};

describe('desktop workflow through the IPC boundary', () => {
  it('opens the selected folder and lets an untouched failed poster retry without a discard prompt', async () => {
    const fixture = bridgeFixture();
    fixture.state.file = { ...fixture.state.file, status: 'error', draft: null, revision: 0, error: 'Model không được provider hỗ trợ.' };
    fixture.state.session = { ...fixture.state.session, counts: { total: 1, analyzed: 0, approved: 0, synced: 0, failed: 1 } };
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<DesktopApp api={fixture.api} />);
    await userEvent.click(screen.getByRole('button', { name: 'Chọn folder ảnh' }));
    expect(await screen.findByRole('textbox', { name: /Tên phiên nhập/ })).toHaveValue('poster-folder');
    await userEvent.click(screen.getByRole('button', { name: 'Tạo phiên và đọc ảnh' }));
    expect(fixture.invoke).toHaveBeenCalledWith('createSession', { selectionId: 'folder-selection', name: 'poster-folder' });
    const poster = await screen.findByRole('button', { name: /look-a.png/ });
    await userEvent.click(poster);
    expect(await screen.findByRole('button', { name: 'Lưu bản nháp' })).toBeEnabled();
    await userEvent.click(screen.getByRole('button', { name: 'Thử phân tích ảnh này' }));
    expect(confirm).not.toHaveBeenCalled();
    expect(fixture.invoke).toHaveBeenCalledWith('analyze', { sessionId: 'session-a', fileIds: ['file-a'] });

    fireEvent.change(screen.getByLabelText('Tiêu đề outfit'), { target: { value: 'Bản nhập thủ công' } });
    await userEvent.click(screen.getByRole('button', { name: /3.*Phân tích/ }));
    expect(confirm).toHaveBeenCalledOnce();
    expect(screen.getByLabelText('Tiêu đề outfit')).toHaveValue('Bản nhập thủ công');

    confirm.mockReturnValue(true);
    await userEvent.click(screen.getByRole('button', { name: /3.*Phân tích/ }));
    expect(screen.getByText('Model không được provider hỗ trợ.')).toBeVisible();
  });

  it('saves a new revision, approves that revision, then sends only the session identity', async () => {
    const fixture = bridgeFixture();
    render(<DesktopApp api={fixture.api} />);
    await openFile();
    fireEvent.change(screen.getByLabelText('Tiêu đề outfit'), { target: { value: 'Outfit đã rà soát' } });
    await userEvent.click(screen.getByRole('button', { name: 'Lưu bản nháp' }));
    await waitFor(() => expect(fixture.invoke).toHaveBeenCalledWith('updateDraft', expect.objectContaining({
      sessionId: 'session-a', fileId: 'file-a', expectedRevision: 1, draft: expect.objectContaining({ title: 'Outfit đã rà soát' }),
    })));
    const approve = await screen.findByRole('button', { name: 'Duyệt phiên bản đã lưu' });
    await waitFor(() => expect(approve).toBeEnabled());
    await userEvent.click(approve);
    await waitFor(() => expect(fixture.invoke).toHaveBeenCalledWith('approve', { sessionId: 'session-a', fileId: 'file-a', expectedRevision: 2 }));
    await userEvent.click(screen.getByRole('button', { name: /5.*Đồng bộ/ }));
    expect(screen.getByText('https://preview.example')).toBeInTheDocument();
    const sync = await screen.findByRole('button', { name: 'Đồng bộ mục đã duyệt' });
    await waitFor(() => expect(sync).toBeEnabled());
    await userEvent.click(sync);
    expect(fixture.invoke).toHaveBeenCalledWith('sync', { sessionId: 'session-a' });
    expect(document.body.innerHTML).not.toContain('test-ui-token-only');
  });

  it('shows a CLI failure, retries through main, and can cancel independently', async () => {
    const fixture = bridgeFixture();
    const original = fixture.invoke.getMockImplementation()!;
    let fail = true;
    fixture.invoke.mockImplementation(async (command, input) => {
      if (command === 'analyze' && fail) throw new Error('Không tìm thấy Codex. Kiểm tra đường dẫn CLI.');
      return original(command, input);
    });
    render(<DesktopApp api={fixture.api} />);
    await openSession();
    await userEvent.click(screen.getByRole('button', { name: 'Phân tích các ảnh chưa xong' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Kiểm tra đường dẫn CLI');
    fail = false;
    await userEvent.click(screen.getByRole('button', { name: 'Phân tích các ảnh chưa xong' }));
    await waitFor(() => expect(fixture.invoke.mock.calls.filter(([command]) => command === 'analyze')).toHaveLength(2));
    await userEvent.click(screen.getByRole('button', { name: 'Hủy tác vụ' }));
    expect(fixture.invoke).toHaveBeenCalledWith('cancel', { sessionId: 'session-a' });
  });

  it('requests filters from main instead of filtering an entire folder in the renderer', async () => {
    const fixture = bridgeFixture();
    render(<DesktopApp api={fixture.api} />);
    await openSession();
    await userEvent.selectOptions(screen.getByLabelText('Lọc trạng thái ảnh'), 'approved');
    await waitFor(() => expect(fixture.invoke).toHaveBeenCalledWith('listFiles', { sessionId: 'session-a', page: 1, size: 20, status: 'approved' }));
  });

  it('keeps unsaved edits when leaving is declined and does not re-open the selected file', async () => {
    const fixture = bridgeFixture();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<DesktopApp api={fixture.api} />);
    await openFile();
    fireEvent.change(screen.getByLabelText('Tiêu đề outfit'), { target: { value: 'Chưa lưu' } });
    await userEvent.click(screen.getByRole('button', { name: /look-a.png/ }));
    expect(confirm).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: /5.*Đồng bộ/ }));
    expect(confirm).toHaveBeenCalledOnce();
    expect(screen.getByLabelText('Tiêu đề outfit')).toHaveValue('Chưa lưu');
    expect(screen.queryByRole('heading', { name: 'Gửi các bản nháp đã duyệt' })).not.toBeInTheDocument();
  });
});

