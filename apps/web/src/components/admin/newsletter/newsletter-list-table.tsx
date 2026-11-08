import type { AdminNewsletterSubscriberDto } from '@under30ss/shared';
import { formatAdminDate } from '@/lib/format-admin-date';
import styles from '../admin.module.css';
import listStyles from '../admin-list.module.css';
import {
  latestSubscribeEvent,
  NEWSLETTER_EMPTY,
  NEWSLETTER_NO_MATCH,
  SOURCE_LABEL,
  STATUS_LABEL,
} from './newsletter-copy';
import { NewsletterRowActions } from './newsletter-row-actions';

interface NewsletterListTableProps {
  items: AdminNewsletterSubscriberDto[];
  filtered: boolean;
  timeZone: string;
}

export function NewsletterListTable({ items, filtered, timeZone }: NewsletterListTableProps) {
  return (
    <table className={listStyles.table} role="table">
      <caption className={styles.srOnly}>Danh sách người đăng ký nhận tin</caption>
      <thead role="rowgroup">
        <tr role="row">
          <th scope="col" role="columnheader">Email</th>
          <th scope="col" role="columnheader">Trạng thái</th>
          <th scope="col" role="columnheader">Ngày đồng ý</th>
          <th scope="col" role="columnheader">Nguồn</th>
          <th scope="col" role="columnheader">Phiên bản đồng ý</th>
          <th scope="col" role="columnheader">
            <span className={styles.srOnly}>Thao tác</span>
          </th>
        </tr>
      </thead>
      <tbody role="rowgroup">
        {items.length === 0 ? (
          <tr role="row">
            <td colSpan={6} role="cell" className={listStyles.emptyRow}>
              {filtered ? NEWSLETTER_NO_MATCH : NEWSLETTER_EMPTY}
            </td>
          </tr>
        ) : (
          items.map((item) => {
            const consent = latestSubscribeEvent(item.events);
            return (
              <tr key={item.id} role="row">
                <td role="cell" data-label="Email">{item.email}</td>
                <td role="cell" data-label="Trạng thái">
                  <span className={`${listStyles.badge} ${item.status === 'subscribed' ? listStyles.badgeOk : ''}`}>
                    {STATUS_LABEL[item.status]}
                  </span>
                </td>
                <td role="cell" data-label="Ngày đồng ý">
                  {formatAdminDate(consent?.at ?? item.createdAt, timeZone, true)}
                </td>
                <td role="cell" data-label="Nguồn">
                  {consent?.source ? (SOURCE_LABEL[consent.source] ?? consent.source) : ''}
                </td>
                <td role="cell" data-label="Phiên bản đồng ý">{consent?.textVersion ?? ''}</td>
                <td role="cell" data-label="">
                  <NewsletterRowActions id={item.id} email={item.email} status={item.status} />
                </td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  );
}
