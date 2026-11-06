import type { Metadata } from 'next';
import { apiUrl, type OutfitResponse } from '@under30ss/shared';
import { OutfitEditor } from '@/components/admin/outfit-editor';
import { adminGet } from '../../../_lib/admin-api';

export const metadata: Metadata = { title: 'Sửa outfit' };

export default async function AdminOutfitEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const outfit = await adminGet<OutfitResponse>(apiUrl.adminOutfit(id));
  return <OutfitEditor key={outfit.id} initial={outfit} />;
}
