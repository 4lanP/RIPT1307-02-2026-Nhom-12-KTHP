import assert from 'node:assert/strict'
import {
  getPositiveMenuShareRows,
  getRelativeQuantityPercent,
  normalizeMenuReportRows,
} from '../../lib/reportData.js'

const normalized = normalizeMenuReportRows([
  { name: 'Bia Tiger', total_quantity: '18' },
  { name: 'Sinh Tố Xoài', total_quantity: 12 },
  { name: 'Không hợp lệ', total_quantity: 'abc' },
])

assert.deepEqual(normalized, [
  { name: 'Bia Tiger', total_quantity: 18 },
  { name: 'Sinh Tố Xoài', total_quantity: 12 },
  { name: 'Không hợp lệ', total_quantity: 0 },
])

assert.deepEqual(
  getPositiveMenuShareRows([
    { name: 'Bia Tiger', total_quantity: '18' },
    { name: 'Zero', total_quantity: 0 },
    { name: 'Null', total_quantity: null },
    { name: 'Missing' },
    { name: 'Invalid', total_quantity: 'abc' },
  ]),
  [{ name: 'Bia Tiger', total_quantity: 18 }]
)

const chartRows = getPositiveMenuShareRows([
  { name: 'Bia Tiger', total_quantity: '18' },
  { name: 'Sinh Tố Xoài', total_quantity: '9' },
])

assert.equal(getRelativeQuantityPercent(chartRows[0], chartRows), 100)
assert.equal(getRelativeQuantityPercent(chartRows[1], chartRows), 50)
