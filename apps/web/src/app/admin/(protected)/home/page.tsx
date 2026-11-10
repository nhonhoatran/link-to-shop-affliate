import type { Metadata } from 'next';
import { HomeEditorScreen } from '@/components/admin/home-editor/home-editor-screen';
import { getWebEnv } from '@/lib/web-env';
import { HomeModeNotice } from '@/components/admin/home-editor/home-mode-notice';
import { getAdminSettings } from '../../_lib/admin-api';
import { getAdminHome } from '../../_lib/admin-home-api';

export const metadata: Metadata = { title: 'Trang chủ' };

export default async function AdminHomePage() {
  const [initial, settings] = await Promise.all([getAdminHome(), getAdminSettings()]);
  return (
    <>
      <HomeModeNotice mode={settings.homeMode} />
      <HomeEditorScreen initial={initial} siteUrl={getWebEnv().SITE_URL} />
    </>
  );
}
