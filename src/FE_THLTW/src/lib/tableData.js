export function normalizeTableRows(rows) {
  if (!Array.isArray(rows)) return []

  return rows.map((row) => {
    const id = row?.id ?? row?.table_id ?? null
    const capacity = row?.capacity == null ? null : Number(row.capacity)
    const name = String(row?.name ?? row?.table_name ?? (id != null ? `Bàn ${id}` : '')).trim()
    const zone = String(row?.zone ?? '').trim()

    return {
      ...row,
      id,
      name,
      table_id: row?.table_id ?? id,
      table_name: row?.table_name ?? name,
      zone,
      capacity: Number.isFinite(capacity) && capacity > 0 ? capacity : null,
      status: row?.status,
      active_session_id: row?.active_session_id ?? null,
    }
  })
}

export function getRenderableTables(rows) {
  return normalizeTableRows(rows).filter((table) => table.id != null && table.name)
}

export function getTableCounts(rows) {
  const tables = getRenderableTables(rows)

  return {
    occupied: tables.filter((table) => table.status === 'OCCUPIED').length,
    available: tables.filter((table) => table.status === 'AVAILABLE').length,
    total: tables.length,
  }
}

export function filterTables(rows, { search = '', status = 'ALL' } = {}) {
  const normalizedSearch = search.trim().toLowerCase()

  return getRenderableTables(rows)
    .filter((table) => status === 'ALL' || table.status === status)
    .filter((table) => {
      if (!normalizedSearch) return true
      return (
        table.name.toLowerCase().includes(normalizedSearch) ||
        table.zone.toLowerCase().includes(normalizedSearch)
      )
    })
}

export function getTableEmptyState({ loading = false, error = null, tables = [], visibleTables = [], search = '', status = 'ALL' } = {}) {
  if (loading) return 'loading'
  if (error) return 'error'
  if (getRenderableTables(tables).length === 0) return 'no-tables'
  if (visibleTables.length === 0 && (search.trim() || status !== 'ALL')) return 'no-match'
  if (visibleTables.length === 0) return 'no-tables'
  return 'data'
}
