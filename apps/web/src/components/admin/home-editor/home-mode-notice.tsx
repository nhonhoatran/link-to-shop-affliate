import Link from 'next/link';
import { DEFAULT_HOME_MODE, type HomeMode } from '@under30ss/shared';
import { ADMIN_PATHS } from '@/lib/admin-paths';
import formStyles from '../admin-form.module.css';

/** Shown while the public home renders the feed, so the editor's sections are not mistaken for what visitors see. */
export function HomeModeNotice({ mode }: { mode: HomeMode | undefined }) {
  if ((mode ?? DEFAULT_HOME_MODE) === 'sections') return null;
  return (
    <p role="status" className={`${formStyles.formError} ${formStyles.formWarning}`}>
      Trang chủ đang hiển thị Feed outfit. Các khối bên dưới chỉ hiện khi chọn &apos;Các khối tự sắp&apos; trong{' '}
      <Link href={ADMIN_PATHS.settings} style={{ color: 'inherit', textDecoration: 'underline' }}>Cài đặt</Link>.
    </p>
  );
}
