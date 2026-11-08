export const HOME_SECTION_COPY = {
  viewAll: 'Xem tất cả',
  slider: {
    defaultLabel: 'Banner trang chủ',
    previous: 'Ảnh trước',
    next: 'Ảnh sau',
    pause: 'Tạm dừng tự chuyển',
    dots: 'Chọn ảnh',
    slideLabel: (index: number, total: number) => `${index} / ${total}`,
    goTo: (index: number, total: number) => `Tới ảnh ${index} / ${total}`,
  },
  rail: {
    previous: 'Xem outfit trước',
    next: 'Xem outfit sau',
  },
  tabs: {
    fallbackLabel: (index: number) => `Nhóm ${index}`,
  },
} as const;
