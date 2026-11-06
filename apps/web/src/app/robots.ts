import type { MetadataRoute } from 'next';
import { getWebEnv } from '@/lib/web-env';
import { absoluteUrl } from '@/lib/seo/absolute-url';

// SITE_URL is a runtime value (not available in the image build), so this is not prerendered.
export const dynamic = 'force-dynamic';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/api'] },
    sitemap: absoluteUrl(getWebEnv().SITE_URL, '/sitemap.xml'),
  };
}
