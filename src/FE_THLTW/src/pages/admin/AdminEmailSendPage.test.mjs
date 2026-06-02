import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import {
  buildImmediateSendPayload,
  getDefaultErrorMessage,
  getStatusLoadErrorMessage,
  runImmediateSendFlow,
  validateEmail,
} from './AdminEmailSendPage.logic.js'

const currentDir = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(resolve(currentDir, 'AdminEmailSendPage.tsx'), 'utf8')
const logicSource = readFileSync(resolve(currentDir, 'AdminEmailSendPage.logic.js'), 'utf8')
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
assert.match(logicSource, /Không gửi được/)
assert.match(source, /Cấu hình email chưa sẵn sàng/)
assert.match(source, /disabled=\{isSubmitting\}/)

assert.match(logicSource, /runImmediateSendFlow/)
assert.equal(validateEmail(''), 'Vui lòng nhập email nhận báo cáo.')
assert.equal(validateEmail('not-an-email'), 'Email nhận báo cáo không hợp lệ.')
assert.equal(validateEmail('a@example.com,b@example.com'), 'Chỉ được gửi đến một email mỗi lần.')
assert.equal(validateEmail(' OWNER@EXAMPLE.COM '), '')
assert.deepEqual(buildImmediateSendPayload({
  recipientEmail: ' OWNER@EXAMPLE.COM ',
  reportDate: '2026-06-01',
}), {
  recipient_email: 'owner@example.com',
  report_date: '2026-06-01',
})

let sendCount = 0
const duplicateResult = await runImmediateSendFlow({
  recipientEmail: 'owner@example.com',
  isSubmitting: true,
  sendDailyRevenueEmailNow: async () => {
    sendCount += 1
  },
})
assert.equal(duplicateResult.blocked, true)
assert.equal(sendCount, 0)

const validationResult = await runImmediateSendFlow({
  recipientEmail: 'bad',
  sendDailyRevenueEmailNow: async () => {
    throw new Error('should not send')
  },
})
assert.equal(validationResult.didSend, false)
assert.equal(validationResult.validationError, 'Email nhận báo cáo không hợp lệ.')

const successResult = await runImmediateSendFlow({
  recipientEmail: ' OWNER@EXAMPLE.COM ',
  reportDate: '2026-06-01',
  sendDailyRevenueEmailNow: async (payload) => ({
    data: {
      status: 'sent',
      recipient_email: payload.recipient_email,
      report_date: payload.report_date,
    },
  }),
})
assert.equal(successResult.didSend, true)
assert.equal(successResult.payload.recipient_email, 'owner@example.com')
assert.equal(successResult.result.status, 'sent')

const unavailableResult = await runImmediateSendFlow({
  recipientEmail: 'owner@example.com',
  sendDailyRevenueEmailNow: async () => {
    throw {
      message: 'Daily revenue email configuration is invalid',
      error: { code: 'VALIDATION_ERROR', category: 'configuration' },
    }
  },
})
assert.equal(unavailableResult.didSend, false)
assert.equal(unavailableResult.failureMessage, 'Daily revenue email configuration is invalid')

assert.equal(
  getDefaultErrorMessage({ error: { category: 'provider-timeout' } }),
  'Nhà cung cấp email phản hồi quá thời gian.'
)
assert.equal(
  getStatusLoadErrorMessage({ message: 'Khong co quyền' }),
  'Bạn không có quyền xem trạng thái gửi email.'
)
