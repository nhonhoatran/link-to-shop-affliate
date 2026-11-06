import Image from 'next/image';
import type { PublicOutfitDto } from '@under30ss/shared';
import { LookbookHotspot } from './lookbook-hotspot';
import { MODEL_IMAGE_SIZES } from './lookbook-image-sizes';
import styles from './lookbook.module.css';

export function LookbookModelFigure({ outfit }: { outfit: PublicOutfitDto }) {
  const { modelImage } = outfit;
  return (
    <figure className={styles.model}>
      <Image
        src={modelImage.url}
        alt={outfit.title}
        width={modelImage.width}
        height={modelImage.height}
        sizes={MODEL_IMAGE_SIZES}
        preload
      />
      {outfit.items.map((item) => (
        <LookbookHotspot key={item.id} item={item} />
      ))}
    </figure>
  );
}
