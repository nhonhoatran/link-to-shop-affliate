import type { Metadata } from 'next';
import Link from 'next/link';
import { HomeSectionList } from '@/components/home-sections/home-section-list';
import { HOME_EDITOR_COPY } from '@/components/admin/home-editor/home-editor-copy';
import styles from '@/components/admin/home-editor/home-editor.module.css';
import { PublicPage } from '@/components/public/public-page';
import { PublicShell } from '@/components/public/public-shell';
import { ADMIN_PATHS } from '@/lib/admin-paths';
import { getPublicSettings } from '@/lib/seo/public-data-loaders';
import { getWebEnv } from '@/lib/web-env';
import { getAdminHomePreview } from '../_lib/admin-home-api';

export const metadata: Metadata = {
  title: 'Xem trước trang chủ',
  robots: { index: false, follow: false },
};

// Outside the (protected) group on purpose: the page must look like the public site, not sit inside the admin shell.
export default async function AdminHomePreviewPage() {
  const [preview, settings] = await Promise.all([getAdminHomePreview(), getPublicSettings()]);
  return (
    <>
      <div role="status" className={styles.previewBanner}>
        <strong>{HOME_EDITOR_COPY.previewPageBanner}</strong>
        <Link href={ADMIN_PATHS.home}>{HOME_EDITOR_COPY.previewPageBack}</Link>
      </div>
      <PublicShell>
        <PublicPage>
          <HomeSectionList
            sections={preview.sections}
            siteUrl={getWebEnv().SITE_URL}
            seoTitle={settings.seoTitle}
            mode="preview"
            fallbackDescription={settings.seoDescription}
          />
        </PublicPage>
      </PublicShell>
    </>
  );
}
