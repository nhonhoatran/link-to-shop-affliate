/**
 * Formats an ISO date in the configured admin time zone. The zone is passed in (never read from
 * the browser) so server and client renders produce the same text.
 */
export const formatAdminDate = (iso: string, timeZone: string, withTime = false): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    ...(withTime ? { timeStyle: 'short' } : {}),
    timeZone,
  }).format(date);
};
