export const COLLECTIONS_COPY = {
  search: {
    label: 'Tìm bộ sưu tập',
    submit: 'Tìm kiếm',
    clear: 'Xoá tìm kiếm',
    resultsLabel: 'Tìm trong bộ sưu tập',
    noResults: 'Không tìm thấy bộ sưu tập',
    tryAgain: 'Thử từ khoá khác hoặc xem tất cả bộ sưu tập.',
    resultCount: (total: number, q: string) => `${total} bộ sưu tập cho “${q}”`,
  },
  empty: {
    title: 'Chưa có bộ sưu tập nào',
    message: 'Các bộ sưu tập sẽ sớm xuất hiện ở đây.',
  },
  emptyCollection: 'Bộ sưu tập này chưa có outfit nào.',
  coverAlt: (name: string) => `Ảnh bìa bộ sưu tập ${name}`,
  fallbackDescription: (siteName: string, label: string) => `${label} phối đồ từ ${siteName}.`,
} as const;
