import { render, screen, within } from '@testing-library/react';
import { samplePublicOutfit } from '@under30ss/shared/fixtures';
import type { PublicOutfitDto } from '@under30ss/shared';
import { describe, expect, it } from 'vitest';
import { FeedPhotoTrack, feedPhotoTotal } from '@/components/feed/feed-photo-track';
import { AFFILIATE_REL } from '@/components/lookbook/lookbook-link-props';

const MODEL_ALT = `${samplePublicOutfit.title} — ảnh người mẫu`;
const total = feedPhotoTotal(samplePublicOutfit);

const renderTrack = (outfit: PublicOutfitDto = samplePublicOutfit) => {
  const { container } = render(<FeedPhotoTrack outfit={outfit} preload={false} />);
  const photos = Array.from(container.querySelectorAll<HTMLElement>('[data-photo-track] > li'));
  return { container, photos };
};

describe('feedPhotoTotal', () => {
  it('counts the lookbook, the model photo and one photo per item', () => {
    expect(total).toBe(2 + samplePublicOutfit.items.length);
  });
});

describe('FeedPhotoTrack', () => {
  it('renders the lookbook, then the model photo, then every item in DTO order', () => {
    const { photos } = renderTrack();
    expect(photos).toHaveLength(total);
    expect(photos[0]!.querySelector('[data-lookbook]')).not.toBeNull();
    expect(within(photos[1]!).getByRole('img', { name: MODEL_ALT })).toBeInTheDocument();
    samplePublicOutfit.items.forEach((item, index) => {
      expect(within(photos[index + 2]!).getByRole('img', { name: item.name })).toBeInTheDocument();
    });
  });

  it('labels every photo with its position out of the total', () => {
    const { photos } = renderTrack();
    photos.forEach((photo, index) => {
      expect(photo).toHaveAttribute('aria-label', `Ảnh ${index + 1}/${total}`);
    });
  });

  it('gives each item a buy link with the sponsored rel, opening in a new tab', () => {
    renderTrack();
    for (const item of samplePublicOutfit.items) {
      const link = screen.getByRole('link', { name: `Mua ngay ${item.name}` });
      expect(link).toHaveAttribute('href', item.affiliateUrl);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', AFFILIATE_REL);
    }
  });

  it.each(['', 'javascript:alert(1)'])('disables the buy link when the affiliate URL is %j', (affiliateUrl) => {
    const [first, ...rest] = samplePublicOutfit.items;
    const outfit: PublicOutfitDto = { ...samplePublicOutfit, items: [{ ...first!, affiliateUrl }, ...rest] };
    renderTrack(outfit);
    const link = screen.getByRole('link', { name: `Mua ngay ${first!.name}` });
    expect(link).toHaveAttribute('href', '#');
    expect(link).toHaveAttribute('aria-disabled', 'true');
    expect(link).toHaveAttribute('tabindex', '-1');
    expect(link).not.toHaveAttribute('target');
  });

  it('still renders the lookbook and model photo for an outfit with no items', () => {
    const { photos } = renderTrack({ ...samplePublicOutfit, items: [] });
    expect(photos).toHaveLength(2);
    expect(within(photos[1]!).getByRole('img', { name: MODEL_ALT })).toBeInTheDocument();
  });
});
