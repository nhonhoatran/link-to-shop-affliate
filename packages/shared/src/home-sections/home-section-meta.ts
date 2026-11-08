import type { HomeSectionType } from './home-section-union';

export interface HomeSectionMeta {
  label: string;
  description: string;
}

export const HOME_SECTION_META: Record<HomeSectionType, HomeSectionMeta> = {
  HeroSlider: { label: 'Banner trượt', description: 'Các ảnh lớn đầu trang, có thể kèm tiêu đề và nút.' },
  CollectionTiles: { label: 'Bộ sưu tập', description: 'Lưới ảnh bìa các bộ sưu tập.' },
  OutfitList: { label: 'Danh sách outfit', description: 'Outfit mới nhất, theo bộ sưu tập hoặc tự chọn.' },
  FeaturedLookbook: { label: 'Lookbook nổi bật', description: 'Một outfit hiển thị đầy đủ các món đồ.' },
  TextWithImage: { label: 'Chữ và ảnh', description: 'Đoạn giới thiệu đi kèm một ảnh.' },
  Faq: { label: 'Câu hỏi thường gặp', description: 'Danh sách câu hỏi và trả lời.' },
  Commitments: { label: 'Cam kết', description: 'Từ 2 đến 4 điểm nổi bật kèm biểu tượng.' },
};
