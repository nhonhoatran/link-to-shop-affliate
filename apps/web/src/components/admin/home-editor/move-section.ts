import { arrayMove } from '@dnd-kit/sortable';

/** Returns the same array when nothing moves, so reducers can skip a re-render. */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const target = Math.max(0, Math.min(list.length - 1, to));
  if (from < 0 || from >= list.length || from === target) return list as T[];
  return arrayMove([...list], from, target);
}

export function moveById<T extends { props: { id: string } }>(list: readonly T[], id: string, to: number): T[] {
  return moveItem(
    list,
    list.findIndex((entry) => entry.props.id === id),
    to,
  );
}
