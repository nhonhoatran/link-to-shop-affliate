import { Be_Vietnam_Pro, Playfair_Display } from 'next/font/google';
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

const playfairDisplay = Playfair_Display({
  subsets: ['vietnamese', 'latin'],
  display: 'swap',
  variable: '--font-playfair-display',
});

// Exception to "no hardcoded colors": metadata cannot read CSS variables. Keep equal to --client-bg.
const THEME_COLOR = '#faf8f5';

export const viewport: Viewport = { themeColor: THEME_COLOR };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" className={`${beVietnamPro.variable} ${playfairDisplay.variable}`}>
      <body>
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
