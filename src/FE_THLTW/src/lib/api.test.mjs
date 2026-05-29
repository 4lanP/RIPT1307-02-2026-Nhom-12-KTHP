import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const currentDir = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(resolve(currentDir, 'api.ts'), 'utf8')

assert.match(source, /let refreshPromise:\s*Promise<string>\s*\|\s*null\s*=\s*null/)
assert.match(source, /if \(!refreshPromise\)/)
assert.match(source, /const isAuthUrl = original\?\.url\?\.startsWith\('\/auth\/'\)/)
assert.match(source, /&& !isAuthUrl/)
assert.doesNotMatch(source, /localStorage\.clear\(\)/)
