import assert from 'node:assert/strict'
import {
  filterTables,
  getTableCounts,
  getTableEmptyState,
  getRenderableTables,
  normalizeTableRows,
} from '../../lib/tableData.js'

const mixedRows = [
  {
    table_id: 1,
    table_name: 'Bàn 01',
    zone: 'Tầng 1',
    capacity: '4',
    status: 'AVAILABLE',
    active_session_id: null,
  },
  {
    id: 2,
    name: 'Bàn VIP',
    zone: 'Sân vườn',
    capacity: 6,
    status: 'OCCUPIED',
    active_session_id: 35,
  },
]

assert.deepEqual(normalizeTableRows(mixedRows), [
  {
    table_id: 1,
    table_name: 'Bàn 01',
    id: 1,
    name: 'Bàn 01',
    zone: 'Tầng 1',
    capacity: 4,
    status: 'AVAILABLE',
    active_session_id: null,
  },
  {
    id: 2,
    name: 'Bàn VIP',
    table_id: 2,
    table_name: 'Bàn VIP',
    zone: 'Sân vườn',
    capacity: 6,
    status: 'OCCUPIED',
    active_session_id: 35,
  },
])

assert.deepEqual(getRenderableTables([{ table_id: null, table_name: 'Lỗi' }, ...mixedRows]).map((table) => table.id), [1, 2])
assert.deepEqual(getTableCounts(mixedRows), { occupied: 1, available: 1, total: 2 })
assert.equal(filterTables(mixedRows, { search: 'vip', status: 'ALL' })[0].id, 2)
assert.equal(filterTables(mixedRows, { search: 'sân', status: 'ALL' })[0].id, 2)
assert.deepEqual(filterTables(mixedRows, { search: '', status: 'AVAILABLE' }).map((table) => table.id), [1])
assert.deepEqual(filterTables(mixedRows, { search: '', status: 'OCCUPIED' }).map((table) => table.id), [2])

assert.equal(getTableEmptyState({ loading: true }), 'loading')
assert.equal(getTableEmptyState({ error: new Error('failed'), tables: mixedRows, visibleTables: [] }), 'error')
assert.equal(getTableEmptyState({ tables: [], visibleTables: [] }), 'no-tables')
assert.equal(getTableEmptyState({ tables: mixedRows, visibleTables: [], search: 'khong-co' }), 'no-match')
assert.equal(getTableEmptyState({ tables: mixedRows, visibleTables: filterTables(mixedRows) }), 'data')
