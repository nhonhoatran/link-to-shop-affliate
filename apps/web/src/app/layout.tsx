import { Be_Vietnam_Pro } from 'next/font/google';
import type { ReactNode } from 'react';
import './globals.css';

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ['vietnamese', 'latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
  variable: '--font-be-vietnam-pro',
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" className={beVietnamPro.variable}>
      <body>{children}</body>
    </html>
  );
}
