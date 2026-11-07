export const NOT_FOUND_COPY = {
  title: 'Không tìm thấy trang',
  message: 'Trang bạn tìm không tồn tại hoặc đã bị ẩn.',
} as const;

export const EMPTY_HOME_COPY = {
  title: 'Chưa có outfit nào',
  message: 'Bộ phối đồ nổi bật sẽ sớm xuất hiện ở đây.',
} as const;

export const EMPTY_LOOKS_COPY = {
  title: 'Chưa có outfit nào',
  message: 'Các bộ phối đồ sẽ sớm xuất hiện ở đây.',
} as const;

export const HOME_LINK = { href: '/', label: 'Về trang chủ' } as const;

export const NAV_LABELS = {
  home: 'Trang chủ',
  looks: 'Tất cả outfit',
} as const;

export const SHELL_COPY = {
  skipLink: 'Bỏ qua tới nội dung',
  mainNav: 'Điều hướng chính',
  footerNav: 'Điều hướng chân trang',
} as const;

export const LOOKS_PAGE_COPY = {
  title: 'Tất cả outfit',
  breadcrumb: 'Đường dẫn trang',
  pagination: 'Phân trang',
  previous: 'Trước',
  next: 'Sau',
  pageLabel: (page: number) => `Trang ${page}`,
  fallbackDescription: (siteName: string) => `Tất cả outfit và gợi ý phối đồ từ ${siteName}.`,
} as const;

export const RELATED_COPY = {
  title: 'Outfit khác',
  viewAll: 'Xem tất cả',
} as const;

export const footerCopyright = (year: number, siteName: string): string => `© ${year} ${siteName}`;
