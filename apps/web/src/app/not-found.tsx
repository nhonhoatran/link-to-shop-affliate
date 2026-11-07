import { HOME_LINK, NOT_FOUND_COPY } from '@/components/public/public-copy';
import { PublicMessage } from '@/components/public/public-message';
import { PublicPage } from '@/components/public/public-page';
import { PublicShell } from '@/components/public/public-shell';

export const metadata = { title: NOT_FOUND_COPY.title };

export default function NotFound() {
  return (
    <PublicShell>
      <PublicPage>
        <PublicMessage title={NOT_FOUND_COPY.title} message={NOT_FOUND_COPY.message} link={HOME_LINK} />
      </PublicPage>
    </PublicShell>
  );
}
