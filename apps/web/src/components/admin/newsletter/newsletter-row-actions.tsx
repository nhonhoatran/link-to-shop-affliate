'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiUrl, type AdminNewsletterSubscriberDto } from '@under30ss/shared';
import { useRedirectOnUnauthorized } from '@/hooks/admin/use-redirect-on-unauthorized';
import { apiFetch } from '@/lib/api-client-browser';
import styles from '../admin.module.css';
import { ConfirmDialog } from '../confirm-dialog';
import { describeApiFailure } from '../describe-api-failure';
import { FormError } from '../field-error';
import { useAdminToast } from '../shell/use-admin-toast';
import { buildDeleteMessage, buildUnsubscribeMessage } from './newsletter-copy';

type Action = 'unsubscribe' | 'delete';

interface NewsletterRowActionsProps {
  id: string;
  email: string;
  status: AdminNewsletterSubscriberDto['status'];
}

export function NewsletterRowActions({ id, email, status }: NewsletterRowActionsProps) {
  const router = useRouter();
  const toast = useAdminToast();
  const redirectToLogin = useRedirectOnUnauthorized();
  const [confirming, setConfirming] = useState<Action | null>(null);
  const [pending, setPending] = useState<Action | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: Action) => {
    setConfirming(null);
    setError(null);
    setPending(action);
    try {
      if (action === 'unsubscribe') {
        await apiFetch(apiUrl.adminNewsletterUnsubscribe(id), { method: 'PATCH' });
        toast.success('Đã huỷ đăng ký');
      } else {
        await apiFetch(apiUrl.adminNewsletterSubscriber(id), { method: 'DELETE' });
        toast.success('Đã xoá người đăng ký');
      }
      router.refresh();
    } catch (err) {
      if (!redirectToLogin(err)) setError(describeApiFailure(err).message);
    } finally {
      setPending(null);
    }
  };

  return (
    <>
      <div className={styles.btnGroup}>
        {status === 'subscribed' ? (
          <button
            type="button"
            className={`${styles.btn} ${styles.btnSecondary}`}
            disabled={pending !== null}
            aria-label={`Huỷ đăng ký ${email}`}
            onClick={() => setConfirming('unsubscribe')}
          >
            {pending === 'unsubscribe' ? 'Đang huỷ…' : 'Huỷ đăng ký'}
          </button>
        ) : null}
        <button
          type="button"
          className={`${styles.btn} ${styles.btnDanger}`}
          disabled={pending !== null}
          aria-label={`Xoá vĩnh viễn ${email}`}
          onClick={() => setConfirming('delete')}
        >
          {pending === 'delete' ? 'Đang xoá…' : 'Xoá vĩnh viễn'}
        </button>
      </div>
      <FormError message={error} />
      <ConfirmDialog
        open={confirming === 'unsubscribe'}
        title="Huỷ đăng ký"
        message={buildUnsubscribeMessage(email)}
        confirmLabel="Huỷ đăng ký"
        cancelLabel="Giữ lại"
        onCancel={() => setConfirming(null)}
        onConfirm={() => void run('unsubscribe')}
      />
      <ConfirmDialog
        open={confirming === 'delete'}
        title="Xoá vĩnh viễn"
        message={buildDeleteMessage(email)}
        confirmLabel="Xoá vĩnh viễn"
        cancelLabel="Giữ lại"
        danger
        onCancel={() => setConfirming(null)}
        onConfirm={() => void run('delete')}
      />
    </>
  );
}
