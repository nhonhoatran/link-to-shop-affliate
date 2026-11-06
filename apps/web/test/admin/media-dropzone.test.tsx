import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MediaDropzone } from '@/components/admin/media-dropzone';
import { jsonResponse } from './admin-outfit-fixture';

const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  router.replace.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const png = () => new File(['x'], 'look.png', { type: 'image/png' });

describe('MediaDropzone as an admin field', () => {
  it('is labelled by the field label and takes aria-invalid / aria-describedby from AdminFormField', () => {
    render(
      <MediaDropzone
        id="model-image"
        kind="model"
        label="Ảnh người mẫu"
        hint="Ảnh dọc, tối thiểu 800px"
        error="Không được để trống"
        onUploaded={vi.fn()}
      />,
    );
    const input = screen.getByLabelText('Ảnh người mẫu');
    expect(input).toHaveAttribute('type', 'file');
    expect(input).toHaveAttribute('id', 'model-image');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'model-image-hint model-image-error');
    expect(document.getElementById('model-image-error')).toHaveTextContent('Không được để trống');
  });

  it('has no aria-invalid without an error', () => {
    render(<MediaDropzone id="model-image" kind="model" label="Ảnh người mẫu" onUploaded={vi.fn()} />);
    expect(screen.getByLabelText('Ảnh người mẫu')).not.toHaveAttribute('aria-invalid');
  });

  it('shows an upload failure through the same field error', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(jsonResponse({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'Ảnh quá lớn' } }, 413));
    render(<MediaDropzone id="model-image" kind="model" label="Ảnh người mẫu" onUploaded={vi.fn()} />);

    await user.upload(screen.getByLabelText('Ảnh người mẫu'), png());

    await waitFor(() => expect(document.getElementById('model-image-error')).toHaveTextContent('Ảnh quá lớn'));
    expect(screen.getByLabelText('Ảnh người mẫu')).toHaveAttribute('aria-invalid', 'true');
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('sends the person to the login page when the session has expired', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(jsonResponse({ error: { code: 'UNAUTHORIZED', message: 'Chưa đăng nhập' } }, 401));
    render(<MediaDropzone id="model-image" kind="model" label="Ảnh người mẫu" onUploaded={vi.fn()} />);

    await user.upload(screen.getByLabelText('Ảnh người mẫu'), png());

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/admin/login'));
  });
});

describe('MediaDropzone instruction text', () => {
  it('shows the in-zone instruction only when no hint is passed', () => {
    const { rerender } = render(<MediaDropzone id="a" kind="model" label="Ảnh" onUploaded={vi.fn()} />);
    expect(screen.getByText('Kéo ảnh vào đây hoặc bấm để chọn')).toBeInTheDocument();

    rerender(<MediaDropzone id="a" kind="model" label="Ảnh" hint="Ảnh dọc" onUploaded={vi.fn()} />);
    expect(screen.queryByText('Kéo ảnh vào đây hoặc bấm để chọn')).not.toBeInTheDocument();
    expect(screen.getAllByText('Ảnh dọc')).toHaveLength(1);
  });
});
