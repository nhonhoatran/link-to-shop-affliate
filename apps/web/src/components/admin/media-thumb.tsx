import Image from 'next/image';
import type { ImageWithUrl } from '@under30ss/shared';
import formStyles from './admin-form.module.css';
import listStyles from './admin-list.module.css';

/** Square preview of an uploaded image, placed right under its dropzone; empty alt when nearby text already names it. */
export function MediaThumb({ image, alt = '' }: { image: ImageWithUrl; alt?: string }) {
  return (
    <div className={formStyles.field}>
      <div className={listStyles.thumb}>
        <Image src={image.url} alt={alt} fill sizes="48px" />
      </div>
    </div>
  );
}
