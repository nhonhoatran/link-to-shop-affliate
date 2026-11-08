import type { HomeSectionType } from './home-section-union';

export interface HomeSectionMeta {
  label: string;
  description: string;
  /** The API resolves data for this section (outfits, collections, consent text). */
  resolvesData: boolean;
  /** The section shows an uploaded image, so it can hold the page's priority (LCP) image. */
  hasImage: boolean;
}

export const HOME_SECTION_META: Record<HomeSectionType, HomeSectionMeta> = {
  HeroSlider: {
    label: 'Banner trượt',
    description: 'Các ảnh lớn đầu trang, có thể kèm tiêu đề và nút.',
    resolvesData: false,
    hasImage: true,
  },
  CollectionTiles: {
    label: 'Bộ sưu tập',
    description: 'Lưới ảnh bìa các bộ sưu tập.',
    resolvesData: true,
    hasImage: true,
  },
  OutfitList: {
    label: 'Danh sách outfit',
    description: 'Outfit mới nhất, theo bộ sưu tập hoặc tự chọn.',
    resolvesData: true,
    hasImage: true,
  },
  FeaturedLookbook: {
    label: 'Lookbook nổi bật',
    description: 'Một outfit hiển thị đầy đủ các món đồ.',
    resolvesData: true,
    hasImage: true,
  },
  TextWithImage: { label: 'Chữ và ảnh', description: 'Đoạn giới thiệu đi kèm một ảnh.', resolvesData: false, hasImage: true },
  Faq: { label: 'Câu hỏi thường gặp', description: 'Danh sách câu hỏi và trả lời.', resolvesData: false, hasImage: false },
  Commitments: {
    label: 'Cam kết',
    description: 'Từ 2 đến 4 điểm nổi bật kèm biểu tượng.',
    resolvesData: false,
    hasImage: false,
  },
  CampaignBanner: {
    label: 'Banner chiến dịch',
    description: 'Một ảnh lớn kèm khung chữ và nút kêu gọi.',
    resolvesData: false,
    hasImage: true,
  },
  Marquee: { label: 'Dải chữ chạy', description: 'Một dòng chữ ngắn chạy ngang trang.', resolvesData: false, hasImage: false },
  Gallery: {
    label: 'Thư viện ảnh',
    description: 'Lưới ảnh các outfit, bấm vào để xem chi tiết.',
    resolvesData: true,
    hasImage: true,
  },
  NewsletterSignup: {
    label: 'Đăng ký nhận tin',
    description: 'Ô nhập email để khách đăng ký nhận tin.',
    resolvesData: true,
    hasImage: false,
  },
};
