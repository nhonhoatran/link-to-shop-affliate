import { Be_Vietnam_Pro } from 'next/font/google';
import type { Viewport } from 'next';
import type { ReactNode } from 'react';
import { MotionProvider } from '@/components/motion/motion-provider';
import './globals.css';

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ['vietnamese', 'latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
  variable: '--font-be-vietnam-pro',
});

// Exception to "no hardcoded colors": metadata cannot read CSS variables. Keep equal to --client-bg.
const THEME_COLOR = '#f6f1ea';

export const viewport: Viewport = { themeColor: THEME_COLOR };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" className={beVietnamPro.variable}>
      <body>
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
