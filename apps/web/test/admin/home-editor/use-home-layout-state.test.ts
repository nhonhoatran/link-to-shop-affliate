import { describe, expect, it } from 'vitest';
import { HOME_SECTION_DEFAULTS } from '@under30ss/shared';
import {
  createSection,
  homeLayoutReducer,
  initialHomeState,
  type HomeLayoutAction,
  type HomeLayoutState,
} from '@/components/admin/home-editor/use-home-layout-state';
import { adminHomeDto } from './home-editor-fixture';

const start = (): HomeLayoutState => initialHomeState(adminHomeDto());
const run = (state: HomeLayoutState, ...actions: HomeLayoutAction[]) => actions.reduce(homeLayoutReducer, state);
const ids = (state: HomeLayoutState) => state.content.map((section) => section.props.id);

describe('createSection', () => {
  it('uses the shared defaults and a fresh id each time', () => {
    const a = createSection('Faq');
    const b = createSection('Faq');
    expect(a.type).toBe('Faq');
    expect(a.props.id).not.toBe(b.props.id);
    expect(a.props).toMatchObject({ title: HOME_SECTION_DEFAULTS.Faq.title, visible: true });
  });

  it('does not share nested defaults between sections', () => {
    const a = createSection('Commitments');
    const b = createSection('Commitments');
    if (a.type !== 'Commitments' || b.type !== 'Commitments') throw new Error('type');
    a.props.items[0]!.title = 'changed';
    expect(b.props.items[0]!.title).toBe('');
    expect(HOME_SECTION_DEFAULTS.Commitments.items[0]!.title).toBe('');
  });
});

describe('homeLayoutReducer', () => {
  it('starts clean and unselected', () => {
    const state = start();
    expect(state.selectedId).toBeNull();
    expect(state.savedJson).toBe(JSON.stringify(state.content));
  });

  it('adds after the selected section and selects the new one', () => {
    const base = start();
    const second = ids(base)[1]!;
    const fresh = createSection('Faq');
    const next = run(base, { type: 'select', id: second }, { type: 'add', section: fresh });
    expect(ids(next)[2]).toBe(fresh.props.id);
    expect(next.selectedId).toBe(fresh.props.id);
  });

  it('adds at the end when nothing is selected', () => {
    const fresh = createSection('Faq');
    const next = run(start(), { type: 'add', section: fresh });
    expect(ids(next).at(-1)).toBe(fresh.props.id);
  });

  it('removes a section and clears the selection only when it was the removed one', () => {
    const base = start();
    const [first, second] = ids(base) as [string, string];
    const removed = run(base, { type: 'select', id: first }, { type: 'remove', id: first });
    expect(ids(removed)).not.toContain(first);
    expect(removed.selectedId).toBeNull();
    const kept = run(base, { type: 'select', id: second }, { type: 'remove', id: first });
    expect(kept.selectedId).toBe(second);
  });

  it('moves a section and keeps the same state object for a no-op move', () => {
    const base = start();
    const first = ids(base)[0]!;
    expect(ids(run(base, { type: 'move', id: first, to: 2 }))[2]).toBe(first);
    expect(run(base, { type: 'move', id: first, to: 0 })).toBe(base);
  });

  it('toggles visibility', () => {
    const base = start();
    const first = ids(base)[0]!;
    const hidden = run(base, { type: 'toggle', id: first });
    expect(hidden.content[0]!.props.visible).toBe(false);
    expect(run(hidden, { type: 'toggle', id: first }).content[0]!.props.visible).toBe(true);
  });

  it('patches props and removes keys set to undefined', () => {
    const base = start();
    const hero = base.content.find((section) => section.type === 'HeroSlider')!;
    const next = run(base, { type: 'update', id: hero.props.id, patch: { label: undefined, autoplaySeconds: 9 } });
    const updated = next.content[0]!;
    expect(updated.props).not.toHaveProperty('label');
    expect(updated.props).toMatchObject({ autoplaySeconds: 9 });
  });

  it('marks the state as saved against what was sent, not what is on screen now', () => {
    const base = start();
    const sentContent = base.content;
    const edited = run(base, { type: 'toggle', id: ids(base)[0]! });
    const saved = run(edited, {
      type: 'saved',
      dto: adminHomeDto({ draftUpdatedAt: 'T2', hasUnpublishedChanges: true }),
      content: sentContent,
    });
    expect(saved.draftUpdatedAt).toBe('T2');
    expect(saved.savedJson).toBe(JSON.stringify(sentContent));
    expect(JSON.stringify(saved.content)).not.toBe(saved.savedJson);
  });

  it('tracks publish, restore and a vanished previous', () => {
    const base = run(start(), { type: 'published', publishedAt: 'P1', previous: { publishedAt: null } });
    expect(base).toMatchObject({ publishedAt: 'P1', hasUnpublishedChanges: false, usingDefault: false });
    const restored = run(base, { type: 'restored', publishedAt: null, previous: { publishedAt: 'P1' } });
    expect(restored).toMatchObject({ publishedAt: null, usingDefault: true, hasUnpublishedChanges: true });
    expect(run(restored, { type: 'noPrevious' }).previous).toBeNull();
  });

  it('replaces everything on load', () => {
    const edited = run(start(), { type: 'select', id: 'x' });
    const loaded = run(edited, { type: 'load', dto: adminHomeDto({ draft: [] }) });
    expect(loaded.content).toEqual([]);
    expect(loaded.selectedId).toBeNull();
  });
});
