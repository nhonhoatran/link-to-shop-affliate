import { HOME_LINK, NOT_FOUND_COPY } from '@/components/public/public-copy';
import { PublicMessage } from '@/components/public/public-message';
import { PublicPage } from '@/components/public/public-page';

export const metadata = { title: NOT_FOUND_COPY.title };

// The (public) layout already provides the shell; the root not-found.tsx adds its own for unmatched URLs.
export default function PublicNotFound() {
  return (
    <PublicPage>
      <PublicMessage title={NOT_FOUND_COPY.title} message={NOT_FOUND_COPY.message} link={HOME_LINK} />
    </PublicPage>
  );
}
