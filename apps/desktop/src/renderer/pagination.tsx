export function Pagination({ page, size, total, onPage, disabled = false, label }: {
  page: number; size: number; total: number; onPage: (page: number) => void; disabled?: boolean; label: string;
}) {
  const pages = Math.max(1, Math.ceil(total / size));
  return <nav className="pagination" aria-label={label}>
    <button type="button" disabled={disabled || page <= 1} onClick={() => onPage(page - 1)} aria-label={`${label}: trang trước`}>Trước</button>
    <span>Trang {page}/{pages} · {total} mục</span>
    <button type="button" disabled={disabled || page >= pages} onClick={() => onPage(page + 1)} aria-label={`${label}: trang sau`}>Sau</button>
  </nav>;
}

