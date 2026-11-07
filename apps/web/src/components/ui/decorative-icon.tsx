import type { LucideIcon } from 'lucide-react';

export function DecorativeIcon({ icon: Icon, size = 20 }: { icon: LucideIcon; size?: number }) {
  return <Icon aria-hidden="true" focusable="false" size={size} />;
}
