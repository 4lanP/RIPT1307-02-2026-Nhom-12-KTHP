import assert from 'node:assert/strict'

export const successEnvelope = (data = {}) => ({
  success: true,
  message: 'Operation completed',
  data,
})

export const errorEnvelope = (code = 'VALIDATION_ERROR', category = 'safe-category') => ({
  success: false,
  message: 'Operation failed',
  error: {
    code,
    category,
  },
})

export const assertSafeErrorEnvelope = (response) => {
  assert.equal(response.success, false)
  assert.equal(typeof response.message, 'string')
  assert.equal(typeof response.error?.code, 'string')
  assert.equal(typeof response.error?.category, 'string')
  assert.doesNotMatch(JSON.stringify(response), /SMTP_PASS|JWT_|refreshToken|password|provider raw/i)
}

export const assertSuccessEnvelope = (response) => {
  assert.equal(response.success, true)
  assert.equal(typeof response.message, 'string')
  assert.ok(Object.hasOwn(response, 'data'))
}

export const readSource = (source) => source
