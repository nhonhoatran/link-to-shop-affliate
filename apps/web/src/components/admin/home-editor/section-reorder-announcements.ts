import type { Announcements, ScreenReaderInstructions } from '@dnd-kit/core';
import { HOME_EDITOR_COPY } from './home-editor-copy';

export interface NamedSection {
  id: string;
  name: string;
}

export const SCREEN_READER_INSTRUCTIONS: ScreenReaderInstructions = { draggable: HOME_EDITOR_COPY.keyboardHelp };

export const movedAnnouncement = (name: string, position: number, total: number) =>
  `Đã chuyển ${name} tới vị trí ${position}/${total}`;

/** dnd-kit reads these aloud while a section is dragged with the keyboard; the defaults are English. */
export function createReorderAnnouncements(sections: readonly NamedSection[]): Announcements {
  const total = sections.length;
  const nameOf = (id: string | number) => sections.find((section) => section.id === id)?.name ?? '';
  const positionOf = (id: string | number) => sections.findIndex((section) => section.id === id) + 1;
  return {
    onDragStart: ({ active }) => `Đã nhấc ${nameOf(active.id)}. Đang ở vị trí ${positionOf(active.id)}/${total}.`,
    onDragOver: ({ active, over }) =>
      over ? `${nameOf(active.id)} đang ở vị trí ${positionOf(over.id)}/${total}.` : undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? `Đã thả ${nameOf(active.id)} tại vị trí ${positionOf(over.id)}/${total}.`
        : `Đã thả ${nameOf(active.id)}. Vị trí không đổi.`,
    onDragCancel: ({ active }) => `Đã huỷ. ${nameOf(active.id)} về vị trí cũ.`,
  };
}
