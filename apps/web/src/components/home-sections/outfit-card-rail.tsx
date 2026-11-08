import type { PublicOutfitCardDto } from '@under30ss/shared';
import { OutfitCard } from '@/components/public/outfit-card';
import { ScrollRail } from './scroll-rail';

interface OutfitCardRailProps {
  items: readonly PublicOutfitCardDto[];
  label: string;
}

export function OutfitCardRail({ items, label }: OutfitCardRailProps) {
  return (
    <ScrollRail label={label}>
      {items.map((outfit) => (
        <li key={outfit.slug}>
          <OutfitCard outfit={outfit} headingLevel="h3" />
        </li>
      ))}
    </ScrollRail>
  );
}
