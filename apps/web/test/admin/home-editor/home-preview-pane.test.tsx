import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { API_PATHS, type HomeSection } from '@under30ss/shared';
import { sampleResolvedHomeSections } from '@under30ss/shared/fixtures';
import { HomePreviewPane } from '@/components/admin/home-editor/home-preview-pane';
import { createSection } from '@/components/admin/home-editor/use-home-layout-state';
import { jsonResponse } from '../admin-outfit-fixture';
import { sampleContent } from './home-editor-fixture';

const router = { push: vi.fn(), replace: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation(async () => jsonResponse({ sections: sampleResolvedHomeSections }));
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const renderPane = (content: HomeSection[] = sampleContent(), onSelectSection = vi.fn(), wide = true) =>
  render(<HomePreviewPane content={content} wide={wide} siteUrl="https://shop.example.test" onSelectSection={onSelectSection} />);

const requestedIds = (call = 0): string[] =>
  JSON.parse(fetchMock.mock.calls[call]![1].body).content.map((section: HomeSection) => section.props.id);

describe('HomePreviewPane', () => {
  it('shows what was typed at once and asks the API only for sections that need data', async () => {
    renderPane();
    expect(screen.getByText('Về chúng tôi')).toBeInTheDocument();
    expect(screen.getByText('Mua hàng ở đâu?')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0]![0]).toBe(API_PATHS.admin.homePreview);
    expect(fetchMock.mock.calls[0]![1].method).toBe('POST');
    expect(requestedIds()).toEqual(['sample-collections', 'sample-outfits', 'sample-lookbook']);
    await waitFor(() => expect(document.querySelector('[data-section-id="sample-outfits"]')).toBeInTheDocument());
  });

  it('does not call the API again for a text-only edit', async () => {
    const content = sampleContent();
    const { rerender } = renderPane(content);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    const edited = structuredClone(content);
    const text = edited.find((section) => section.type === 'TextWithImage')!;
    (text.props as { heading: string }).heading = 'Tiêu đề mới';
    rerender(<HomePreviewPane content={edited} wide siteUrl="https://shop.example.test" onSelectSection={vi.fn()} />);
    expect(screen.getByText('Tiêu đề mới')).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 600));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('leaves out hidden sections and sections that are not finished yet', async () => {
    const content = sampleContent();
    content[1]!.props.visible = false;
    content.push(createSection('OutfitList'), createSection('TextWithImage'));
    content.at(-2)!.props.id = 'half-done';
    (content.at(-2)!.props as { title: string }).title = '';
    renderPane(content);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(requestedIds()).toEqual(['sample-outfits', 'sample-lookbook']);
    expect(document.querySelector('[data-section-id="half-done"]')).not.toBeInTheDocument();
    expect(document.querySelector('[data-section-id="sample-collections"]')).not.toBeInTheDocument();
  });

  it('selects the section that was clicked', async () => {
    const onSelect = vi.fn();
    renderPane(sampleContent(), onSelect);
    fireEvent.click(screen.getByText('Mua hàng ở đâu?'));
    expect(onSelect).toHaveBeenCalledWith('sample-faq');
  });

  it('stops links from navigating', () => {
    renderPane();
    const link = screen.getByRole('link', { name: 'Tìm hiểu thêm' });
    expect(fireEvent.click(link)).toBe(false);
  });

  it('switches between desktop and phone width', async () => {
    const user = userEvent.setup();
    renderPane(sampleContent(), vi.fn(), true);
    const desktop = screen.getByRole('button', { name: 'Máy tính' });
    const phone = screen.getByRole('button', { name: 'Điện thoại' });
    expect(desktop).toHaveAttribute('aria-pressed', 'true');
    await user.click(phone);
    expect(phone).toHaveAttribute('aria-pressed', 'true');
    expect(desktop).toHaveAttribute('aria-pressed', 'false');
  });

  it('starts on the phone width when it is not beside the editor', () => {
    renderPane(sampleContent(), vi.fn(), false);
    expect(screen.getByRole('button', { name: 'Điện thoại' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('keeps showing text sections and warns when the API cannot be reached', async () => {
    fetchMock.mockImplementation(async () => jsonResponse({ error: { code: 'INTERNAL', message: 'down' } }, 500));
    renderPane();
    expect(await screen.findByText(/Không cập nhật được xem trước/)).toBeInTheDocument();
    expect(screen.getByText('Về chúng tôi')).toBeInTheDocument();
  });

  it('sends a 401 to the login page', async () => {
    fetchMock.mockImplementation(async () => jsonResponse({ error: { code: 'UNAUTHORIZED', message: 'No session' } }, 401));
    renderPane();
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/admin/login'));
  });

  it('says what to do when nothing can be shown', () => {
    renderPane([]);
    expect(screen.getByText(/Chưa có gì để xem trước/)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
