import styles from './admin.module.css';
import listStyles from './admin-list.module.css';
import { AdminFormField } from './admin-form-field';
import type { OutfitListQuery } from './outfit-list-query';

/** Plain GET form: the server re-renders the list, no client state. */
export function OutfitListFilters({ query }: { query: OutfitListQuery }) {
  return (
    <form method="get" action="/admin" role="search" className={listStyles.filters}>
      <AdminFormField id="filter-q" label="Tìm theo tên" compact>
        {(control) => <input {...control} type="search" name="q" defaultValue={query.q} maxLength={100} />}
      </AdminFormField>
      <AdminFormField id="filter-status" label="Trạng thái" compact>
        {(control) => (
          <select {...control} name="status" defaultValue={query.status ?? ''}>
            <option value="">Tất cả</option>
            <option value="draft">Bản nháp</option>
            <option value="published">Đã đăng</option>
          </select>
        )}
      </AdminFormField>
      <button type="submit" className={`${styles.btn} ${styles.btnSecondary}`}>
        Tìm
      </button>
    </form>
  );
}
