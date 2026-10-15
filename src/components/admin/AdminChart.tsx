import type { ReactNode } from 'react'
import { ResponsiveContainer } from 'recharts'

type ChartColumn<Row> = { key: keyof Row; label: string; format?: (value: Row[keyof Row], row: Row) => ReactNode }

export function AdminChart<Row extends Record<string, unknown>>({
  title,
  summary,
  children,
  rows,
  columns,
  height = 280,
  /** When true, skip outer card + visible title (Stitch panels supply their own chrome). */
  bare = false,
}: {
  title: string
  summary: string
  children: ReactNode
  rows: Row[]
  columns: Array<ChartColumn<Row>>
  height?: number
  bare?: boolean
}) {
  return (
    <figure aria-label={title} className={bare ? 'm-0' : 'ops-card p-5'}>
      {!bare && (
        <>
          <figcaption className="font-bold text-on-surface">{title}</figcaption>
          <p className="mt-1 text-sm text-on-surface-variant">{summary}</p>
        </>
      )}
      {bare && <figcaption className="sr-only">{title}. {summary}</figcaption>}
      <div className={bare ? undefined : 'mt-4'} style={{ height }} aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
      </div>
      <div className="sr-only">
        <table>
          <caption>{title}</caption>
          <thead><tr>{columns.map((column) => <th key={String(column.key)}>{column.label}</th>)}</tr></thead>
          <tbody>{rows.map((row, index) => <tr key={index}>{columns.map((column) => <td key={String(column.key)}>{column.format ? column.format(row[column.key], row) : String(row[column.key] ?? '')}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </figure>
  )
}
