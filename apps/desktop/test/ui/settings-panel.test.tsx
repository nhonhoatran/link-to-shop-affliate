import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_POSTER_PROMPT, DEFAULT_POSTER_PROMPT_VERSION } from '@under30ss/shared';
import { SettingsPanel } from '../../src/renderer/settings-panel';
import { settingsFixture } from './desktop-fixture';

describe('desktop settings', () => {
  it('pre-fills the Vietnamese prompt, shows its version read-only, and resets edited text', async () => {
    const initial = settingsFixture();
    const save = vi.fn().mockResolvedValue(initial);
    render(<SettingsPanel initial={initial} busy={false} onSave={save} onCheck={vi.fn()} />);
    await userEvent.click(screen.getByText('Prompt phân tích · đã có sẵn'));
    expect(screen.getByLabelText('Prompt tiếng Việt')).toHaveValue(DEFAULT_POSTER_PROMPT);
    fireEvent.change(screen.getByLabelText('Prompt tiếng Việt'), { target: { value: 'Nội dung tự chỉnh' } });
    expect(screen.getByLabelText('Phiên bản prompt').tagName).toBe('OUTPUT');
    expect(screen.getByText('Phiên bản được tạo tự động khi lưu.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Khôi phục prompt mặc định' }));
    expect(screen.getByLabelText('Prompt tiếng Việt')).toHaveValue(DEFAULT_POSTER_PROMPT);
    expect(screen.getByLabelText('Phiên bản prompt')).toHaveTextContent(DEFAULT_POSTER_PROMPT_VERSION);
  });

  it('resets a previously saved custom prompt and its automatically generated version', async () => {
    const initial = settingsFixture();
    initial.settings.prompt = { version: 'vi-poster.v1+custom-saved', text: 'Prompt tùy chỉnh đã lưu' };
    render(<SettingsPanel initial={initial} busy={false} onSave={vi.fn()} onCheck={vi.fn()} />);
    await userEvent.click(screen.getByText('Prompt phân tích · đã có sẵn'));
    expect(screen.getByLabelText('Phiên bản prompt')).toHaveTextContent('vi-poster.v1+custom-saved');
    await userEvent.click(screen.getByRole('button', { name: 'Khôi phục prompt mặc định' }));
    expect(screen.getByLabelText('Prompt tiếng Việt')).toHaveValue(DEFAULT_POSTER_PROMPT);
    expect(screen.getByLabelText('Phiên bản prompt')).toHaveTextContent(DEFAULT_POSTER_PROMPT_VERSION);
  });

  it('clears the raw token before an asynchronous save finishes', async () => {
    const initial = settingsFixture();
    let finish: (value: typeof initial) => void = () => undefined;
    const save = vi.fn(() => new Promise<typeof initial>((resolve) => { finish = resolve; }));
    render(<SettingsPanel initial={initial} busy={false} onSave={save} onCheck={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('Token nhập nháp'), 'test-ui-token-only');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu cấu hình' }));
    await waitFor(() => expect(save).toHaveBeenCalledWith(initial.settings, 'test-ui-token-only', false));
    expect(screen.getByLabelText('Token nhập nháp')).toHaveValue('');
    expect(document.body.textContent).not.toContain('test-ui-token-only');
    finish(initial);
  });

  it('requires saving a changed destination before checking its connection', async () => {
    const initial = settingsFixture();
    const check = vi.fn();
    render(<SettingsPanel initial={initial} busy={false} onSave={vi.fn()} onCheck={check} />);
    const button = screen.getByRole('button', { name: 'Kiểm tra kết nối website' });
    expect(button).toBeEnabled();
    fireEvent.change(screen.getByLabelText('Địa chỉ website'), { target: { value: 'https://other.example' } });
    expect(button).toBeDisabled();
    expect(screen.getByText('Lưu cấu hình trước khi kiểm tra kết nối.')).toBeInTheDocument();
    expect(check).not.toHaveBeenCalled();
  });

  it('shows invalid settings without forwarding the token or configuration', async () => {
    const save = vi.fn();
    render(<SettingsPanel initial={settingsFixture()} busy={false} onSave={save} onCheck={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Địa chỉ website'), { target: { value: 'http://remote.example' } });
    await userEvent.type(screen.getByLabelText('Token nhập nháp'), 'test-ui-token-only');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu cấu hình' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('HTTPS');
    expect(save).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Token nhập nháp')).toHaveValue('');
  });
});

