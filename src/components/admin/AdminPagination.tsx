type AdminPaginationProps = {
  page: number
  totalPages: number
  totalItems?: number
  onPageChange: (page: number) => void
}

export function AdminPagination({ page, totalPages, totalItems, onPageChange }: AdminPaginationProps) {
  if (totalPages <= 1) return null
  return (
    <nav className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm" aria-label="Phân trang">
      <p className="text-slate-600">
        Trang {page + 1}/{totalPages}{typeof totalItems === 'number' ? ` · ${totalItems} bản ghi` : ''}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={page <= 0}
          onClick={() => onPageChange(page - 1)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Trang trước
        </button>
        <button
          type="button"
          disabled={page + 1 >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Trang sau
        </button>
      </div>
    </nav>
  )
}
