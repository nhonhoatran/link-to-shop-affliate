import { samplePublicOutfit } from '@under30ss/shared/fixtures';
import { buildOutfitJsonLd, serializeJsonLd } from '@/lib/seo/build-outfit-json-ld';

const SEPARATORS = `a${String.fromCharCode(0x2028)}b${String.fromCharCode(0x2029)}c`;
const SITE = 'https://shop.example.test/';

describe('buildOutfitJsonLd', () => {
  it('builds a CollectionPage with an ItemList in left-then-right order', () => {
    const data = buildOutfitJsonLd(samplePublicOutfit, SITE, 'Mo ta');
    expect(data['@type']).toBe('CollectionPage');
    expect(data.name).toBe(samplePublicOutfit.title);
    expect(data.description).toBe('Mo ta');
    expect(data.url).toBe(`https://shop.example.test/look/${samplePublicOutfit.slug}`);
    expect(data.mainEntity['@type']).toBe('ItemList');
    expect(data.mainEntity.numberOfItems).toBe(samplePublicOutfit.items.length);
    const first = data.mainEntity.itemListElement[0]!;
    expect(first.position).toBe(1);
    expect(first.image).toMatch(/^https?:\/\//);
  });

  it('uses the affiliate url, or the page url when the link is empty', () => {
    const outfit = {
      ...samplePublicOutfit,
      items: samplePublicOutfit.items.map((item, i) => (i === 0 ? { ...item, affiliateUrl: '' } : { ...item, affiliateUrl: 'https://aff.example.test/x' })),
    };
    const data = buildOutfitJsonLd(outfit, SITE);
    const urls = data.mainEntity.itemListElement.map((el) => el.url);
    expect(urls).toContain(data.url);
    expect(urls.filter((u) => u === data.url)).toHaveLength(1);
    expect(urls).toContain('https://aff.example.test/x');
    expect(data).not.toHaveProperty('description');
  });

  it('makes relative media urls absolute', () => {
    const outfit = { ...samplePublicOutfit, modelImage: { ...samplePublicOutfit.modelImage, url: '/media/public/a.webp' } };
    expect(buildOutfitJsonLd(outfit, SITE).image).toBe('https://shop.example.test/media/public/a.webp');
  });
});

describe('serializeJsonLd', () => {
  it('escapes "<" so a title cannot close the script tag', () => {
    const json = serializeJsonLd({ name: '</script><script>alert(1)</script>' });
    expect(json).not.toContain('<');
    expect(JSON.parse(json).name).toBe('</script><script>alert(1)</script>');
  });

  it('escapes line and paragraph separators', () => {
    const json = serializeJsonLd({ name: SEPARATORS });
    expect(json).not.toContain(String.fromCharCode(0x2028));
    expect(json).not.toContain(String.fromCharCode(0x2029));
    expect(JSON.parse(json).name).toBe(SEPARATORS);
  });
});
