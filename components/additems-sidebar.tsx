'use client'

import Link from 'next/link'
import { Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'

type AddItemsNode = {
  title: string
  children?: AddItemsNode[]
}

type ShopRow = {
  title: string
  breadcrumb: string
}

type AddItemsSidebarProps = {
  open: boolean
  pinned: boolean
  onRequestClose: () => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

function flattenShopRows(nodes: AddItemsNode[], ancestors: string[] = []): ShopRow[] {
  const rows: ShopRow[] = []
  for (const n of nodes) {
    rows.push({
      title: n.title,
      breadcrumb: ancestors.join(' › '),
    })
    if (n.children?.length) {
      rows.push(...flattenShopRows(n.children, [...ancestors, n.title]))
    }
  }
  return rows
}

/** Keep branches that match the query, or contain matching descendants. */
function filterTreeByQuery(nodes: AddItemsNode[], q: string): AddItemsNode[] {
  const needle = q.trim().toLowerCase()
  if (!needle) return nodes

  const result: AddItemsNode[] = []
  for (const node of nodes) {
    const titleMatch = node.title.toLowerCase().includes(needle)
    const filteredChildren = node.children?.length ? filterTreeByQuery(node.children, q) : []

    if (titleMatch) {
      result.push({ title: node.title, children: node.children })
    } else if (filteredChildren.length > 0) {
      result.push({ title: node.title, children: filteredChildren })
    }
  }
  return result
}

function sortShopRows(rows: ShopRow[], needle: string): ShopRow[] {
  const n = needle.trim().toLowerCase()
  if (!n) return rows

  return [...rows].sort((a, b) => {
    const ta = a.title.toLowerCase()
    const tb = b.title.toLowerCase()
    const score = (t: string) => {
      if (t === n) return 0
      if (t.startsWith(n)) return 1
      if (t.includes(n)) return 2
      return 3
    }
    const ra = Math.min(score(ta), a.breadcrumb.toLowerCase().includes(n) ? 2 : 4)
    const rb = Math.min(score(tb), b.breadcrumb.toLowerCase().includes(n) ? 2 : 4)
    if (ra !== rb) return ra - rb
    return a.title.localeCompare(b.title)
  })
}

function CategoryLink({
  title,
  pinned,
  onRequestClose,
  className,
}: {
  title: string
  pinned: boolean
  onRequestClose: () => void
  className?: string
}) {
  return (
    <Link
      href={`/category/products/${encodeURIComponent(title)}`}
      onClick={(e) => {
        e.stopPropagation()
        if (!pinned) onRequestClose()
      }}
      className={className}
    >
      {title}
    </Link>
  )
}

function BrowseTree({
  nodes,
  pinned,
  onRequestClose,
  depth = 0,
}: {
  nodes: AddItemsNode[]
  pinned: boolean
  onRequestClose: () => void
  depth?: number
}) {
  return (
    <ul className={cn('space-y-0.5', depth > 0 && 'ml-0.5 mt-1 border-l border-border/50 pl-2.5')}>
      {nodes.map((node, idx) => (
        <li key={`${depth}-${node.title}-${idx}`} className="list-none">
          {node.children?.length ? (
            <details className="group rounded-md">
              <summary className="flex cursor-pointer list-none items-stretch gap-0.5 rounded-md py-0.5 marker:content-none [&::-webkit-details-marker]:hidden">
                <span
                  className="flex w-6 shrink-0 items-center justify-center rounded-md text-xs text-muted-foreground transition group-open:rotate-90"
                  aria-hidden
                >
                  ›
                </span>
                <CategoryLink
                  title={node.title}
                  pinned={pinned}
                  onRequestClose={onRequestClose}
                  className="min-w-0 flex-1 rounded-md px-2 py-1.5 text-left text-sm font-medium leading-snug text-foreground hover:bg-accent hover:text-accent-foreground"
                />
              </summary>
              <BrowseTree nodes={node.children} pinned={pinned} onRequestClose={onRequestClose} depth={depth + 1} />
            </details>
          ) : (
            <CategoryLink
              title={node.title}
              pinned={pinned}
              onRequestClose={onRequestClose}
              className="block w-full rounded-md px-2 py-2 pl-8 text-left text-sm leading-snug text-foreground hover:bg-accent hover:text-accent-foreground"
            />
          )}
        </li>
      ))}
    </ul>
  )
}

export function AddItemsSidebar({
  open,
  pinned,
  onRequestClose,
  onMouseEnter,
  onMouseLeave,
}: AddItemsSidebarProps) {
  const [items, setItems] = useState<AddItemsNode[] | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    let alive = true

    async function load() {
      try {
        const res = await fetch('/api/additems', { cache: 'no-store' })
        if (!res.ok) throw new Error('Failed to fetch additems')
        const data = (await res.json()) as { items: AddItemsNode[] }
        if (alive) setItems(data.items)
      } catch (e) {
        console.error(e)
        if (alive) setItems([])
      }
    }

    load()
    return () => {
      alive = false
    }
  }, [])

  const shopRows = useMemo(() => (items ? flattenShopRows(items) : []), [items])

  const trimmedQuery = query.trim()
  const listMode = trimmedQuery.length > 0

  const filteredRows = useMemo(() => {
    if (!listMode) return []
    const n = trimmedQuery.toLowerCase()
    return sortShopRows(
      shopRows.filter(
        (r) => r.title.toLowerCase().includes(n) || r.breadcrumb.toLowerCase().includes(n),
      ),
      trimmedQuery,
    )
  }, [listMode, shopRows, trimmedQuery])

  const browseTree = useMemo(() => {
    if (!items) return []
    if (listMode) return []
    return filterTreeByQuery(items, '')
  }, [items, listMode])

  const content = useMemo(() => {
    if (!items) {
      return (
        <div className="space-y-3 p-4">
          <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
        </div>
      )
    }

    if (items.length === 0) {
      return <div className="p-4 text-sm text-muted-foreground">No categories loaded.</div>
    }

    if (listMode) {
      if (filteredRows.length === 0) {
        return (
          <div className="p-4 text-sm text-muted-foreground">
            No categories match “{trimmedQuery}”. Try a shorter word (for example “brake” or “filter”).
          </div>
        )
      }

      return (
        <ul className="space-y-1 p-2">
          {filteredRows.map((row, idx) => (
            <li key={`${row.title}-${row.breadcrumb}-${idx}`} className="list-none">
              <Link
                href={`/category/products/${encodeURIComponent(row.title)}`}
                onClick={() => {
                  if (!pinned) onRequestClose()
                }}
                className="block rounded-lg border border-transparent px-3 py-2.5 text-left transition hover:border-border hover:bg-muted/40"
              >
                {row.breadcrumb ? (
                  <p className="mb-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">{row.breadcrumb}</p>
                ) : null}
                <p className="text-sm font-medium leading-snug text-foreground">{row.title}</p>
              </Link>
            </li>
          ))}
        </ul>
      )
    }

    return (
      <div className="p-2 pb-4">
        <BrowseTree nodes={browseTree} pinned={pinned} onRequestClose={onRequestClose} />
      </div>
    )
  }, [items, listMode, filteredRows, browseTree, trimmedQuery, pinned, onRequestClose])

  return (
    <aside
      className={cn(
        'fixed left-0 top-14 md:top-16 z-50 flex h-[calc(100vh-3.5rem)] md:h-[calc(100vh-4rem)] w-[min(100vw-1rem,340px)] max-w-[86vw] flex-col overflow-hidden border-r border-border bg-card shadow-xl transition-transform duration-200',
        open ? 'translate-x-0' : '-translate-x-full',
        open ? 'pointer-events-auto' : 'pointer-events-none',
      )}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      aria-hidden={!open}
    >
      <div className="flex shrink-0 flex-col gap-2 border-b border-border px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-sm font-semibold text-foreground">Find parts</div>
            <p className="text-[11px] leading-snug text-muted-foreground">Search the menu, then open a category.</p>
          </div>
          {pinned ? (
            <button
              type="button"
              className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
              onClick={onRequestClose}
            >
              Close
            </button>
          ) : null}
        </div>

        <Link
          href="/"
          onClick={() => {
            if (!pinned) onRequestClose()
          }}
          className="text-xs font-medium text-primary hover:underline"
        >
          View all products
        </Link>

        <label className="relative block">
          <span className="sr-only">Search categories</span>
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. brake pads, oil filter…"
            autoComplete="off"
            className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">{content}</div>
    </aside>
  )
}
