import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OutfitEditor } from '@/components/admin/outfit-editor';
import { mapEditorStateToPublicDto } from '@/components/admin/map-editor-state-to-public-dto';
import { editorReducer, fromAdminOutfit, isDirty, snapshotOf, toOutfitInput } from '@/hooks/admin/editor-state';
import { jsonResponse, makeAdminOutfit } from './admin-outfit-fixture';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/admin/outfits/outfit-1',
}));
const fetchMock = vi.fn();
beforeEach(() => { fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock); });
afterEach(() => vi.unstubAllGlobals());

describe('outfit arrows option', () => {
  it('defaults legacy editor state to off and includes changes in save and preview', () => {
    let state = fromAdminOutfit(makeAdminOutfit());
    expect(state.showArrows).toBe(false);
    expect(mapEditorStateToPublicDto(state).showArrows).toBe(false);
    state = editorReducer(state, { type: 'showArrows', value: true });
    expect(isDirty(state)).toBe(true);
    expect(toOutfitInput(state).showArrows).toBe(true);
    expect(mapEditorStateToPublicDto(state).showArrows).toBe(true);
    state = editorReducer(state, { type: 'saved', status: state.status, snapshot: snapshotOf(state) });
    expect(isDirty(state)).toBe(false);
    state = editorReducer(state, { type: 'showArrows', value: false });
    expect(isDirty(state)).toBe(true);
  });

  it('offers both options, saves the selected value and reloads it in the editor', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(jsonResponse({}));
    const view = render(<OutfitEditor initial={makeAdminOutfit()} />);
    expect(screen.getByRole('combobox', { name: 'Mũi tên nối sản phẩm' })).toHaveValue('false');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Mũi tên nối sản phẩm' }), 'true');
    expect(screen.getByText('Có thay đổi chưa lưu')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Lưu' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body).showArrows).toBe(true);
    await waitFor(() => expect(screen.queryByText('Có thay đổi chưa lưu')).not.toBeInTheDocument());
    view.unmount();
    render(<OutfitEditor initial={makeAdminOutfit((outfit) => { outfit.showArrows = true; })} />);
    expect(screen.getByRole('combobox', { name: 'Mũi tên nối sản phẩm' })).toHaveValue('true');
  });
});
