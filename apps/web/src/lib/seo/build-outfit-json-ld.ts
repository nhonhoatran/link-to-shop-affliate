import { compareOutfitItems, type PublicOutfitDto } from '@under30ss/shared';
import { absoluteUrl, outfitPath } from './absolute-url';

export const buildOutfitJsonLd = (outfit: PublicOutfitDto, siteUrl: string, description?: string) => {
  const pageUrl = absoluteUrl(siteUrl, outfitPath(outfit.slug));
  const items = [...outfit.items].sort(compareOutfitItems);
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: outfit.title,
    ...(description ? { description } : {}),
    url: pageUrl,
    image: absoluteUrl(siteUrl, outfit.modelImage.url),
    dateModified: outfit.updatedAt,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: items.length,
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        url: item.affiliateUrl || pageUrl,
        image: absoluteUrl(siteUrl, item.image.url),
      })),
    },
  };
};

/** `<` is escaped so text like `</script>` cannot close the tag; U+2028/2029 break old JS parsers. */
export const serializeJsonLd = (data: unknown): string =>
  JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replaceAll(String.fromCharCode(0x2028), '\\u2028')
    .replaceAll(String.fromCharCode(0x2029), '\\u2029');
