import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const currentDir = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(resolve(currentDir, 'AdminEmailSendPage.tsx'), 'utf8')
const appSource = readFileSync(resolve(currentDir, '../../App.tsx'), 'utf8')
const layoutSource = readFileSync(resolve(currentDir, '../../layouts/StaffLayout.tsx'), 'utf8')
const apiSource = readFileSync(resolve(currentDir, '../../lib/api.ts'), 'utf8')

assert.match(apiSource, /sendDailyRevenueEmailNow:\s*\(data\)\s*=>\s*api\.post\('\/admin\/reports\/daily-email\/send-now', data\)/)
assert.match(apiSource, /getDailyRevenueEmailStatus:\s*\(\)\s*=>\s*api\.get\('\/admin\/reports\/daily-email\/status'\)/)

assert.match(appSource, /AdminEmailSendPage/)
assert.match(appSource, /path="admin\/email-send"/)
assert.match(appSource, /roles=\{\['ADMIN'\]\}/)

assert.match(layoutSource, /\/admin\/email-send/)
assert.match(layoutSource, /Gửi báo cáo/)
assert.match(layoutSource, /roles: \['ADMIN'\]/)

assert.match(source, /recipientEmail/)
assert.match(source, /reportDate/)
assert.match(source, /isSubmitting/)
assert.match(source, /validateEmail/)
assert.match(source, /sendDailyRevenueEmailNow/)
assert.match(source, /getDailyRevenueEmailStatus/)
assert.match(source, /Đang gửi/)
assert.match(source, /Gửi báo cáo/)
assert.match(source, /Không gửi được/)
assert.match(source, /Cấu hình email chưa sẵn sàng/)
assert.match(source, /disabled=\{isSubmitting\}/)
