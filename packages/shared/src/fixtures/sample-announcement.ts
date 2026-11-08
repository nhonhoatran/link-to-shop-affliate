import { announcementSchema, publicAnnouncementSchema, type AnnouncementInput, type PublicAnnouncementDto } from '../settings-schemas';

export const sampleAnnouncementInput: AnnouncementInput = announcementSchema.parse({
  enabled: true,
  text: 'Miễn phí vận chuyển cho đơn từ 300.000đ',
  linkLabel: 'Xem ngay',
  href: '/looks',
});

export const samplePublicAnnouncement: PublicAnnouncementDto = publicAnnouncementSchema.parse({
  text: sampleAnnouncementInput.text,
  linkLabel: sampleAnnouncementInput.linkLabel,
  href: sampleAnnouncementInput.href,
});
