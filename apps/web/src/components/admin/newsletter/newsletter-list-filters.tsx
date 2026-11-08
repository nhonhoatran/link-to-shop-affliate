import { NEWSLETTER_STATUSES } from '@under30ss/shared';
import { ADMIN_PATHS } from '@/lib/admin-paths';
import styles from '../admin.module.css';
import listStyles from '../admin-list.module.css';
import { AdminFormField } from '../admin-form-field';
import { STATUS_LABEL } from './newsletter-copy';
import type { NewsletterListQuery } from './newsletter-list-query';

/** Plain GET form: the server re-renders the list, no client state. */
export function NewsletterListFilters({ query }: { query: NewsletterListQuery }) {
  return (
    <form method="get" action={ADMIN_PATHS.newsletter} role="search" className={listStyles.filters}>
      <AdminFormField id="filter-q" label="Tìm theo email" compact>
        {(control) => <input {...control} type="search" name="q" defaultValue={query.q} maxLength={100} />}
      </AdminFormField>
      <AdminFormField id="filter-status" label="Trạng thái" compact>
        {(control) => (
          <select {...control} name="status" defaultValue={query.status ?? ''}>
            <option value="">Tất cả</option>
            {NEWSLETTER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABEL[status]}
              </option>
            ))}
          </select>
        )}
      </AdminFormField>
      <button type="submit" className={`${styles.btn} ${styles.btnSecondary}`}>
        Tìm
      </button>
    </form>
  );
}
