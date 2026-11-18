import { Search } from 'lucide-react';
import { COLLECTIONS_PAGE_PATH, MAX_COLLECTION_SEARCH_LENGTH } from '@under30ss/shared';
import { DecorativeIcon } from '@/components/ui/decorative-icon';
import hidden from '@/styles/visually-hidden.module.css';
import { COLLECTIONS_COPY } from './collection-copy';
import styles from './collection-search.module.css';

interface CollectionSearchProps {
  id: string;
  query?: string;
  label?: string;
}

/** Native GET form: search and pagination keep working without JavaScript. */
export function CollectionSearch({ id, query = '', label = COLLECTIONS_COPY.search.label }: CollectionSearchProps) {
  return (
    <form action={COLLECTIONS_PAGE_PATH} method="get" role="search" aria-label={label} className={styles.form}>
      <label htmlFor={id} className={hidden.hidden}>{label}</label>
      <input id={id} name="q" type="search" defaultValue={query} placeholder={COLLECTIONS_COPY.search.label} maxLength={MAX_COLLECTION_SEARCH_LENGTH} className={styles.input} />
      <button type="submit" className={styles.submit} aria-label={COLLECTIONS_COPY.search.submit}>
        <DecorativeIcon icon={Search} />
      </button>
    </form>
  );
}
