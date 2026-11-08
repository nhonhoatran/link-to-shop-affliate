export const HOME_SECTION_COPY = {
  viewAll: 'Xem tất cả',
  slider: {
    defaultLabel: 'Banner trang chủ',
    previous: 'Ảnh trước',
    next: 'Ảnh sau',
    pause: 'Tạm dừng tự chuyển',
    dots: 'Chọn ảnh',
    counter: (index: number, total: number) => `${String(index).padStart(2, '0')} / ${String(total).padStart(2, '0')}`,
    slideLabel: (index: number, total: number) => `${index} / ${total}`,
    goTo: (index: number, total: number) => `Tới ảnh ${index} / ${total}`,
  },
  rail: {
    previous: 'Xem outfit trước',
    next: 'Xem outfit sau',
  },
  marquee: {
    defaultLabel: 'Thông điệp cửa hàng',
    toggleLabel: 'Tạm dừng chuyển động',
    pause: 'Tạm dừng',
    resume: 'Tiếp tục',
  },
  newsletter: {
    emailLabel: 'Email',
    submitting: 'Đang gửi',
    previewNote: 'Xem trước, không gửi',
    honeypotLabel: 'Website',
    successDefault: 'Cảm ơn bạn đã đăng ký',
    failure: {
      invalid: 'Email hoặc phần đồng ý chưa hợp lệ. Vui lòng kiểm tra lại',
      rate: 'Bạn gửi quá nhanh. Vui lòng thử lại sau ít phút',
      stale: 'Nội dung đồng ý vừa được cập nhật. Vui lòng tải lại trang và đồng ý lại.',
      error: 'Chưa đăng ký được. Vui lòng thử lại sau',
    },
  },
  tabs: {
    fallbackLabel: (index: number) => `Nhóm ${index}`,
  },
} as const;
