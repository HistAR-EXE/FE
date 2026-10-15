import { MaterialIcon } from '../ui/MaterialIcon'

type AdminPaginationProps = {
  page: number
  totalPages: number
  totalItems?: number
  onPageChange: (page: number) => void
  /** Stitch numbered pager (1 2 3 … last). Default = prev/next only. */
  variant?: 'default' | 'stitch'
}

function stitchPageTokens(page: number, totalPages: number): Array<number | 'ellipsis'> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index)
  }
  const tokens: Array<number | 'ellipsis'> = []
  const push = (value: number | 'ellipsis') => {
    if (tokens[tokens.length - 1] === value) return
    tokens.push(value)
  }
  push(0)
  if (page <= 2) {
    push(1)
    push(2)
    push('ellipsis')
    push(totalPages - 1)
    return tokens
  }
  if (page >= totalPages - 3) {
    push('ellipsis')
    push(totalPages - 3)
    push(totalPages - 2)
    push(totalPages - 1)
    return tokens
  }
  push('ellipsis')
  push(page - 1)
  push(page)
  push(page + 1)
  push('ellipsis')
  push(totalPages - 1)
  return tokens
}

export function AdminPagination({
  page,
  totalPages,
  totalItems,
  onPageChange,
  variant = 'default',
}: AdminPaginationProps) {
  if (totalPages <= 1) return null

  if (variant === 'stitch') {
    const tokens = stitchPageTokens(page, totalPages)
    return (
      <nav className="flex items-center gap-1" aria-label="Phân trang">
        <button
          type="button"
          disabled={page <= 0}
          onClick={() => onPageChange(page - 1)}
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-container text-outline hover:bg-surface-variant hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Trang trước"
        >
          <MaterialIcon name="chevron_left" className="text-[16px]" />
        </button>
        {tokens.map((token, index) =>
          token === 'ellipsis' ? (
            <span key={`e-${index}`} className="px-1 font-mono text-[11px] text-outline">
              …
            </span>
          ) : (
            <button
              key={token}
              type="button"
              onClick={() => onPageChange(token)}
              aria-current={token === page ? 'page' : undefined}
              className={
                token === page
                  ? 'flex h-7 min-w-7 items-center justify-center rounded-lg bg-primary px-2 font-mono text-[11px] font-bold text-on-primary'
                  : 'flex h-7 min-w-7 items-center justify-center rounded-lg bg-surface-container px-2 font-mono text-[11px] text-on-surface hover:bg-surface-variant'
              }
            >
              {token + 1}
            </button>
          ),
        )}
        <button
          type="button"
          disabled={page + 1 >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-container text-outline hover:bg-surface-variant hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Trang sau"
        >
          <MaterialIcon name="chevron_right" className="text-[16px]" />
        </button>
      </nav>
    )
  }

  return (
    <nav className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm" aria-label="Phân trang">
      <p className="text-on-surface-variant">
        Trang {page + 1}/{totalPages}
        {typeof totalItems === 'number' ? ` · ${totalItems} bản ghi` : ''}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={page <= 0}
          onClick={() => onPageChange(page - 1)}
          className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 font-semibold text-on-surface hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-50"
        >
          Trang trước
        </button>
        <button
          type="button"
          disabled={page + 1 >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 font-semibold text-on-surface hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-50"
        >
          Trang sau
        </button>
      </div>
    </nav>
  )
}
