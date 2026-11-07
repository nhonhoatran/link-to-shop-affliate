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
  // Keep `next dev` from writing AGENTS.md/CLAUDE.md into the app; assistant tooling stays out of the repo.
  agentRules: false,
  // In production Caddy sends /api/* to the API. `next dev` has no Caddy, so proxy it here to keep the
  // browser same-origin (session cookie, origin check). Filesystem routes such as /api/revalidate still win.
  async rewrites() {
    const apiUrl = process.env.API_INTERNAL_URL;
    if (process.env.NODE_ENV !== 'development' || !apiUrl) return [];
    return [{ source: '/api/:path*', destination: `${apiUrl.replace(/\/$/, '')}/api/:path*` }];
  },
};

export default nextConfig;
