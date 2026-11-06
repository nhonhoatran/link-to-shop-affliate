import { PublicMessage } from '@/components/public/public-message';
import { HOME_LINK, NOT_FOUND_COPY } from '@/components/public/public-copy';

export const metadata = { title: NOT_FOUND_COPY.title };

export default function NotFound() {
  return <PublicMessage title={NOT_FOUND_COPY.title} message={NOT_FOUND_COPY.message} link={HOME_LINK} />;
}
