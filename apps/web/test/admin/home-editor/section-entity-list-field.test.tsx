import { useState } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { SectionEntityListField } from '@/components/admin/home-editor/section-entity-list-field';
import type { EntityKind } from '@/components/admin/home-editor/use-entity-labels';
import { jsonResponse } from '../admin-outfit-fixture';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));

const fetchMock = vi.fn();

const NAMES: Record<string, string> = { o1: 'Outfit Một', o2: 'Outfit Hai', o3: 'Outfit Ba', c1: 'Streetwear', c2: 'Đi làm' };
const outfitRow = (id: string) => ({ id, slug: id, title: NAMES[id], status: 'published', featured: false, updatedAt: '', modelImageUrl: `/m/${id}.webp` });
const collectionRow = (id: string) => ({ id, slug: id, name: NAMES[id], status: 'published', order: 0, outfitCount: 1, coverImageUrl: null, updatedAt: '' });

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
});

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (url: string) => {
    const path = String(url);
    const single = /\/api\/admin\/(outfits|collections)\/([^/?]+)$/.exec(path);
    if (single) return jsonResponse(single[1] === 'outfits' ? { id: single[2], title: NAMES[single[2]!] } : { id: single[2], name: NAMES[single[2]!] });
    if (path.startsWith('/api/admin/outfits?')) return jsonResponse({ items: ['o1', 'o2', 'o3'].map(outfitRow), total: 3, page: 1, size: 20 });
    if (path.startsWith('/api/admin/collections?')) return jsonResponse({ items: ['c1', 'c2'].map(collectionRow), total: 2, page: 1, size: 20 });
    return jsonResponse({}, 404);
  });
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

function Harness({ kind, initial, max, onChange }: { kind: EntityKind; initial: string[]; max: number; onChange?: (ids: string[]) => void }) {
  const [ids, setIds] = useState(initial);
  return (
    <SectionEntityListField
      id="field"
      dataField="outfitIds"
      label="Danh sách"
      kind={kind}
      ids={ids}
      max={max}
      error={undefined}
      onChange={(next) => {
        setIds(next);
        onChange?.(next);
      }}
    />
  );
}

const names = () => screen.queryAllByRole('listitem').map((item) => item.textContent?.split(/Lên|Xuống|Gỡ/)[0]);
const lookupCalls = () => fetchMock.mock.calls.filter(([url]) => /\/(outfits|collections)\/[^/?]+$/.test(String(url)));

describe('SectionEntityListField', () => {
  it('looks up the name of each saved id once and shows a placeholder meanwhile', async () => {
    render(<Harness kind="outfit" initial={['o1', 'o2']} max={5} />);
    expect(screen.getAllByText('Đang tải…')).toHaveLength(2);
    await waitFor(() => expect(names()).toEqual(['Outfit Một', 'Outfit Hai']));
    expect(lookupCalls()).toHaveLength(2);
  });

  it('says so when nothing is picked', () => {
    render(<Harness kind="collection" initial={[]} max={3} />);
    expect(screen.getByText('Chưa chọn bộ sưu tập nào.')).toBeInTheDocument();
  });

  it('adds picked outfits after the existing ones, skips duplicates and reuses names from the picker', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness kind="outfit" initial={['o1']} max={5} onChange={onChange} />);
    await waitFor(() => expect(names()).toEqual(['Outfit Một']));

    await user.click(screen.getByRole('button', { name: '+ Thêm outfit' }));
    const dialog = screen.getByRole('dialog', { name: 'Chọn outfit' });
    await user.click(await within(dialog).findByRole('checkbox', { name: /Outfit Một/ }));
    await user.click(within(dialog).getByRole('checkbox', { name: /Outfit Ba/ }));
    await user.click(within(dialog).getByRole('button', { name: 'Thêm vào danh sách' }));

    expect(onChange).toHaveBeenLastCalledWith(['o1', 'o3']);
    await waitFor(() => expect(names()).toEqual(['Outfit Một', 'Outfit Ba']));
    expect(lookupCalls()).toHaveLength(1);
  });

  it('refuses a pick that does not fit and disables adding at the limit', async () => {
    const user = userEvent.setup();
    render(<Harness kind="outfit" initial={['o1']} max={2} />);
    await user.click(screen.getByRole('button', { name: '+ Thêm outfit' }));
    const dialog = screen.getByRole('dialog', { name: 'Chọn outfit' });
    await user.click(await within(dialog).findByRole('checkbox', { name: /Outfit Hai/ }));
    await user.click(within(dialog).getByRole('checkbox', { name: /Outfit Ba/ }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Chỉ chọn thêm được tối đa 1');
    expect(within(dialog).getByRole('button', { name: 'Thêm vào danh sách' })).toBeDisabled();
    await user.click(within(dialog).getByRole('checkbox', { name: /Outfit Ba/ }));
    await user.click(within(dialog).getByRole('button', { name: 'Thêm vào danh sách' }));
    expect(screen.getByRole('button', { name: '+ Thêm outfit' })).toBeDisabled();
  });

  it('reorders and removes with named buttons', async () => {
    const user = userEvent.setup();
    render(<Harness kind="outfit" initial={['o1', 'o2']} max={5} />);
    await waitFor(() => expect(names()).toEqual(['Outfit Một', 'Outfit Hai']));
    expect(screen.getByRole('button', { name: 'Đưa Outfit Một lên' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Đưa Outfit Một xuống' }));
    expect(names()).toEqual(['Outfit Hai', 'Outfit Một']);
    await user.click(screen.getByRole('button', { name: 'Gỡ Outfit Hai' }));
    expect(names()).toEqual(['Outfit Một']);
  });

  it('picks collections through the collection picker', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness kind="collection" initial={[]} max={3} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: '+ Thêm bộ sưu tập' }));
    const dialog = screen.getByRole('dialog', { name: 'Chọn bộ sưu tập' });
    // A real dialog focuses its first control (the search box), which is what makes this picker load its list.
    await user.click(within(dialog).getByRole('searchbox'));
    await user.click(await within(dialog).findByRole('checkbox', { name: /Đi làm/ }));
    await user.click(within(dialog).getByRole('button', { name: 'Thêm vào danh sách' }));
    expect(onChange).toHaveBeenLastCalledWith(['c2']);
    await waitFor(() => expect(names()).toEqual(['Đi làm']));
  });

  it('replaces the single choice instead of adding, with no reorder buttons', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness kind="outfit" initial={['o1']} max={1} onChange={onChange} />);
    await waitFor(() => expect(names()).toEqual(['Outfit Một']));
    expect(screen.queryByRole('button', { name: /^Đưa/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Đổi outfit' }));
    const dialog = screen.getByRole('dialog', { name: 'Chọn outfit' });
    await user.click(await within(dialog).findByRole('checkbox', { name: /Outfit Hai/ }));
    await user.click(within(dialog).getByRole('button', { name: 'Thêm vào danh sách' }));
    expect(onChange).toHaveBeenLastCalledWith(['o2']);
  });
});
