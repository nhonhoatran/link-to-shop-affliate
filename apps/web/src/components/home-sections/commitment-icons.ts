import {
  Award,
  BadgeCheck,
  Gift,
  Headset,
  Heart,
  MessageCircle,
  PackageCheck,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Tag,
  Truck,
  type LucideIcon,
} from 'lucide-react';
import type { CommitmentIcon } from '@under30ss/shared';

export const COMMITMENT_ICON_COMPONENTS: Record<CommitmentIcon, LucideIcon> = {
  truck: Truck,
  'shield-check': ShieldCheck,
  'refresh-ccw': RefreshCcw,
  sparkles: Sparkles,
  heart: Heart,
  gift: Gift,
  tag: Tag,
  'badge-check': BadgeCheck,
  'package-check': PackageCheck,
  headset: Headset,
  award: Award,
  'message-circle': MessageCircle,
};
