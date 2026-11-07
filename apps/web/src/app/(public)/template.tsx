import type { ReactNode } from 'react';
import motion from '@/styles/motion-primitives.module.css';

export default function PublicTemplate({ children }: { children: ReactNode }) {
  return <div className={motion.fadeIn}>{children}</div>;
}
