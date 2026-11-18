import type { Metadata } from 'next';
import { MAX_LIST_PAGE, IMPORT_API_PATHS, importTokenListSchema } from '@under30ss/shared';
import { AdminPanel } from '@/components/admin/admin-panel';
import { AdminFormField } from '@/components/admin/admin-form-field';
import { ImportTokenCreateForm } from '@/components/admin/import-token-create-form';
import { ImportTokenList } from '@/components/admin/import-token-list';
import { CollectionPagination } from '@/components/admin/collections/collection-pagination';
import styles from '@/components/admin/admin.module.css';
import { ADMIN_PATHS } from '@/lib/admin-paths';
import { getWebEnv } from '@/lib/web-env';
import { adminGet } from '../../_lib/admin-api';

export const metadata: Metadata = { title: 'Token nhập desktop' };

export default async function ImportTokensPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const input = (await searchParams).page;
  const pageNumber = typeof input === 'string' ? Number(input) : 1;
  const page = Number.isInteger(pageNumber) && pageNumber > 0 && pageNumber <= MAX_LIST_PAGE ? pageNumber : 1;
  const list = importTokenListSchema.parse(await adminGet(`${IMPORT_API_PATHS.tokens}?page=${page}`));
  const env = getWebEnv();
  return (
    <div className={`${styles.narrow} ${styles.stack}`}>
      <div className={styles.toolbar}><h1 className={styles.title}>Token nhập desktop</h1></div>
      <AdminPanel id="import-destination" title="Kết nối ứng dụng desktop">
        <AdminFormField id="import-site-url" label="URL website" hint="Dùng URL này khi kết nối ứng dụng desktop.">
          {(control) => <input {...control} readOnly value={env.SITE_URL} />}
        </AdminFormField>
        <p className={styles.hint}>Token chỉ được tải ảnh và tạo bộ sưu tập, outfit ở trạng thái nháp. Xuất bản, cài đặt và quản trị viên vẫn được quản lý trên website.</p>
      </AdminPanel>
      <ImportTokenCreateForm />
      <ImportTokenList items={list.items} timeZone={env.ADMIN_TIME_ZONE} nowIso={new Date().toISOString()} />
      <CollectionPagination page={list.page} totalPages={Math.max(1, Math.ceil(list.total / list.size))}
        hrefForPage={(target) => `${ADMIN_PATHS.importTokens}${target > 1 ? `?page=${target}` : ''}`} />
    </div>
  );
}
