import type { NewsletterConsentEventDto } from '@under30ss/shared';

export const NEWSLETTER_PAGE_TITLE = 'Đăng ký nhận tin';
export const NEWSLETTER_EXPORT_LABEL = 'Xuất CSV';
export const NEWSLETTER_EMPTY = 'Chưa có người đăng ký.';
export const NEWSLETTER_NO_MATCH = 'Không có kết quả phù hợp.';

export const STATUS_LABEL = { subscribed: 'Đang nhận tin', unsubscribed: 'Đã huỷ' } as const;
export const SOURCE_LABEL: Record<string, string> = { home: 'Trang chủ' };

export const buildUnsubscribeMessage = (email: string): string =>
  `Huỷ đăng ký cho ${email}? Địa chỉ này sẽ không nhận email nữa. Bản ghi vẫn được giữ để ghi nhận việc huỷ.`;

export const buildDeleteMessage = (email: string): string =>
  `Xoá vĩnh viễn ${email}? Chỉ dùng khi người đăng ký yêu cầu xoá dữ liệu. Không hoàn tác được.`;

/** The consent that put the person on the list: the most recent subscribe event. */
export const latestSubscribeEvent = (events: NewsletterConsentEventDto[]): NewsletterConsentEventDto | undefined =>
  events.filter((event) => event.type === 'subscribe').at(-1);
