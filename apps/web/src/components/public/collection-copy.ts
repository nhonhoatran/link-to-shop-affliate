export const COLLECTIONS_COPY = {
  empty: {
    title: 'Chưa có bộ sưu tập nào',
    message: 'Các bộ sưu tập sẽ sớm xuất hiện ở đây.',
  },
  emptyCollection: 'Bộ sưu tập này chưa có outfit nào.',
  coverAlt: (name: string) => `Ảnh bìa bộ sưu tập ${name}`,
  fallbackDescription: (siteName: string, label: string) => `${label} phối đồ từ ${siteName}.`,
} as const;
