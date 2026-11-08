import type { AdminCollectionDto, ImageWithUrl, OutfitStatus } from '@under30ss/shared';

export interface CollectionFormValues {
  name: string;
  slug: string;
  description: string;
  seoDescription: string;
  status: OutfitStatus;
  coverImage: ImageWithUrl | undefined;
}

export const COVER_REQUIRED_MESSAGE = 'Bộ sưu tập đã đăng cần ảnh bìa';

export const emptyCollectionValues: CollectionFormValues = {
  name: '',
  slug: '',
  description: '',
  seoDescription: '',
  status: 'draft',
  coverImage: undefined,
};

export const fromCollection = (dto: AdminCollectionDto): CollectionFormValues => ({
  name: dto.name,
  slug: dto.slug,
  description: dto.description ?? '',
  seoDescription: dto.seoDescription ?? '',
  status: dto.status,
  coverImage: dto.coverImage,
});

/** Shape sent to the API; empty optional text is left out so the server clears it. */
export const toCollectionInput = (values: CollectionFormValues) => ({
  slug: values.slug,
  name: values.name,
  status: values.status,
  ...(values.description.trim() ? { description: values.description } : {}),
  ...(values.seoDescription.trim() ? { seoDescription: values.seoDescription } : {}),
  ...(values.coverImage
    ? { coverImage: { key: values.coverImage.key, width: values.coverImage.width, height: values.coverImage.height } }
    : {}),
});

export const snapshotOfCollection = (values: CollectionFormValues): string => JSON.stringify(toCollectionInput(values));

/** The shared schema reports a missing cover with a generic message; say what is wrong in the person's words. */
export const withCoverMessage = (errors: Record<string, string>, values: CollectionFormValues): Record<string, string> =>
  errors.coverImage && !values.coverImage ? { ...errors, coverImage: COVER_REQUIRED_MESSAGE } : errors;
