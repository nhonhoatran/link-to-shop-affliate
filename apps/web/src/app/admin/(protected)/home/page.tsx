import type { Metadata } from 'next';
import { HomeEditorScreen } from '@/components/admin/home-editor/home-editor-screen';
import { getWebEnv } from '@/lib/web-env';
import { getAdminHome } from '../../_lib/admin-home-api';

export const metadata: Metadata = { title: 'Trang chủ' };

export default async function AdminHomePage() {
  const initial = await getAdminHome();
  return <HomeEditorScreen initial={initial} siteUrl={getWebEnv().SITE_URL} />;
}
