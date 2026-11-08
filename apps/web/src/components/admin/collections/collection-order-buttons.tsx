'use client';

import { ArrowDown, ArrowUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { CollectionMoveRequest } from '@under30ss/shared';
import { apiUrl } from '@under30ss/shared';
import { DecorativeIcon } from '@/components/ui/decorative-icon';
import { useRedirectOnUnauthorized } from '@/hooks/admin/use-redirect-on-unauthorized';
import { apiFetch } from '@/lib/api-client-browser';
import styles from '../admin.module.css';
import { describeApiFailure } from '../describe-api-failure';
import { FieldError } from '../field-error';

interface CollectionOrderButtonsProps {
  id: string;
  name: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

export function CollectionOrderButtons({ id, name, canMoveUp, canMoveDown }: CollectionOrderButtonsProps) {
  const router = useRouter();
  const redirectToLogin = useRedirectOnUnauthorized();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const move = async (direction: CollectionMoveRequest['direction']) => {
    setPending(true);
    setError(undefined);
    try {
      await apiFetch(apiUrl.adminCollectionMove(id), { method: 'POST', json: { direction } satisfies CollectionMoveRequest });
      router.refresh();
    } catch (err) {
      if (!redirectToLogin(err)) setError(describeApiFailure(err).message);
    } finally {
      setPending(false);
    }
  };

  const buttonClass = `${styles.btn} ${styles.btnSecondary}`;
  return (
    <>
      <div className={styles.btnGroup}>
        {canMoveUp ? (
          <button type="button" className={buttonClass} disabled={pending} aria-label={`Chuyển ${name} lên`} onClick={() => void move('up')}>
            <DecorativeIcon icon={ArrowUp} size={16} />
            Lên
          </button>
        ) : null}
        {canMoveDown ? (
          <button type="button" className={buttonClass} disabled={pending} aria-label={`Chuyển ${name} xuống`} onClick={() => void move('down')}>
            <DecorativeIcon icon={ArrowDown} size={16} />
            Xuống
          </button>
        ) : null}
      </div>
      <FieldError id={`${id}-move-error`} message={error} />
    </>
  );
}
