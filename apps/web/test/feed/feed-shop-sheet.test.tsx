import { fireEvent, render, screen, within } from '@testing-library/react';
import { samplePublicOutfit } from '@under30ss/shared/fixtures';
import type { PublicOutfitItemDto } from '@under30ss/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FeedShopSheet } from '@/components/feed/feed-shop-sheet';
import { AFFILIATE_REL } from '@/components/lookbook/lookbook-link-props';

// jsdom implements <dialog> without showModal/close; mirror the browser's open attribute.
const showModal = vi.fn(function (this: HTMLDialogElement) {
  this.setAttribute('open', '');
});
// Like the browser, closing fires the close event that returns focus to the opener.
const close = vi.fn(function (this: HTMLDialogElement) {
  if (!this.hasAttribute('open')) return;
  this.removeAttribute('open');
  this.dispatchEvent(new Event('close'));
});

const items = samplePublicOutfit.items;
const trigger = () => screen.getByRole('button', { name: `Mua đồ trong outfit (${items.length} món)` });
const renderSheet = (list: readonly PublicOutfitItemDto[] = items) => {
  const view = render(<FeedShopSheet items={list} />);
  return { ...view, dialog: view.container.querySelector('dialog')! };
};

beforeEach(() => {
  showModal.mockClear();
  close.mockClear();
  HTMLDialogElement.prototype.showModal = showModal;
  HTMLDialogElement.prototype.close = close;
});

describe('FeedShopSheet', () => {
  it('shows the item count on the trigger and opens the dialog when pressed', () => {
    const { dialog } = renderSheet();
    expect(trigger()).toHaveAttribute('aria-haspopup', 'dialog');
    expect(trigger()).toHaveTextContent(String(items.length));
    expect(dialog.open).toBe(false);

    fireEvent.click(trigger());
    expect(showModal).toHaveBeenCalledTimes(1);
    expect(dialog.open).toBe(true);
  });

  it('lists every item with its name, subtitle and a buy link', () => {
    const { dialog } = renderSheet();
    const rows = within(dialog).getAllByRole('listitem', { hidden: true });
    expect(rows).toHaveLength(items.length);
    items.forEach((item, index) => {
      expect(rows[index]).toHaveTextContent(item.name);
      if (item.subtitle) expect(rows[index]).toHaveTextContent(item.subtitle);
    });
  });

  it('opens every buy link in a new tab with the sponsored rel', () => {
    const { dialog } = renderSheet();
    for (const item of items) {
      const link = within(dialog).getByRole('link', { name: `Mua ngay ${item.name}`, hidden: true });
      expect(link).toHaveAttribute('href', item.affiliateUrl);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', AFFILIATE_REL);
    }
  });

  it('disables the buy link of an item whose affiliate URL is unsafe', () => {
    const [first] = items;
    const { dialog } = renderSheet([{ ...first!, affiliateUrl: 'javascript:alert(1)' }]);
    const link = within(dialog).getByRole('link', { name: `Mua ngay ${first!.name}`, hidden: true });
    expect(link).toHaveAttribute('href', '#');
    expect(link).toHaveAttribute('aria-disabled', 'true');
    expect(link).not.toHaveAttribute('target');
  });

  it('closes from the close button and returns focus to the "Mua đồ" button', () => {
    const { dialog } = renderSheet();
    trigger().focus();
    fireEvent.click(trigger());
    fireEvent.click(within(dialog).getByRole('button', { name: 'Đóng', hidden: true }));
    expect(close).toHaveBeenCalledTimes(1);
    expect(dialog.open).toBe(false);
    expect(document.activeElement).toBe(trigger());
  });

  it('returns focus to the "Mua đồ" button when the dialog closes by itself (Esc)', () => {
    const { dialog } = renderSheet();
    trigger().focus();
    fireEvent.click(trigger());
    // jsdom has no Esc handling: dialog.close() stands in for the browser closing it on Esc.
    dialog.close();
    expect(dialog.open).toBe(false);
    expect(document.activeElement).toBe(trigger());
  });

  it('closes on a click on the backdrop, the dialog element itself, and returns focus', () => {
    const { dialog } = renderSheet();
    trigger().focus();
    fireEvent.click(trigger());
    fireEvent.click(dialog);
    expect(close).toHaveBeenCalledTimes(1);
    expect(dialog.open).toBe(false);
    expect(document.activeElement).toBe(trigger());
  });

  it('stays open when the click lands on the sheet content', () => {
    const { dialog } = renderSheet();
    fireEvent.click(trigger());
    fireEvent.click(within(dialog).getByText(items[0]!.name));
    expect(close).not.toHaveBeenCalled();
    expect(dialog.open).toBe(true);
  });

  it('renders nothing when the outfit has no items', () => {
    const { container } = renderSheet([]);
    expect(container).toBeEmptyDOMElement();
  });
});
