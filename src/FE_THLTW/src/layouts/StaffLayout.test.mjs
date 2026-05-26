import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const currentDir = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(resolve(currentDir, 'StaffLayout.tsx'), 'utf8')

assert.match(source, /to:\s*'\/tables'[\s\S]*label:\s*'Sơ đồ bàn'/)
assert.match(source, /to:\s*'\/admin\/tables'[\s\S]*label:\s*'Cấu hình bàn'/)
assert.match(source, /to:\s*'\/tables'[\s\S]*roles:\s*\['ADMIN',\s*'MANAGER',\s*'CASHIER',\s*'WAITER'\]/)
assert.match(source, /to:\s*'\/admin\/tables'[\s\S]*roles:\s*\['ADMIN',\s*'MANAGER'\]/)
