import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: repoRoot,
  turbopack: { root: repoRoot },
  // The API already serves resized WebP, and inside the web container the media host
  // (localhost) is not reachable by the image optimizer, so images are served as-is.
  images: { unoptimized: true },
};

export default nextConfig;
