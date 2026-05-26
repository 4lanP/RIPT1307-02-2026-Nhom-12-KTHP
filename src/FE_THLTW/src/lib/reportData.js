export function normalizeMenuReportRows(rows) {
  if (!Array.isArray(rows)) return []

  return rows.map((row) => {
    const totalQuantity = Number(row?.total_quantity)

    return {
      ...row,
      name: row?.name || '',
      total_quantity: Number.isFinite(totalQuantity) ? totalQuantity : 0,
    }
  })
}

export function getPositiveMenuShareRows(rows) {
  return normalizeMenuReportRows(rows).filter((row) => row.name && row.total_quantity > 0)
}

export function getTopMenuQuantity(rows) {
  return getPositiveMenuShareRows(rows)[0]?.total_quantity || 0
}

export function getRelativeQuantityPercent(row, rows) {
  const quantity = Number(row?.total_quantity || 0)
  const maxQuantity = getTopMenuQuantity(rows)
  if (!maxQuantity || !Number.isFinite(quantity) || quantity <= 0) return 0
  return (quantity / maxQuantity) * 100
}
