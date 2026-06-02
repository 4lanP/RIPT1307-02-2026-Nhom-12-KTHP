const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const providerFailureMessages = {
  'provider-timeout': 'Nhà cung cấp email phản hồi quá thời gian.',
  'provider-auth': 'Cấu hình xác thực email chưa hợp lệ.',
  'provider-rejected': 'Nhà cung cấp email đã từ chối yêu cầu gửi.',
  'provider-rate-limit': 'Nhà cung cấp email đang giới hạn lượt gửi.',
}

export const formatCurrency = (value) => new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
}).format(Number(value) || 0)

export const normalizeRecipientEmail = (value) => String(value || '').trim().toLowerCase()

export const validateEmail = (value) => {
  const normalized = normalizeRecipientEmail(value)
  if (!normalized) return 'Vui lòng nhập email nhận báo cáo.'
  if (normalized.includes(',')) return 'Chỉ được gửi đến một email mỗi lần.'
  if (!emailPattern.test(normalized)) return 'Email nhận báo cáo không hợp lệ.'
  return ''
}

export const buildImmediateSendPayload = ({ recipientEmail, reportDate }) => {
  const payload = {
    recipient_email: normalizeRecipientEmail(recipientEmail),
  }

  if (reportDate) {
    payload.report_date = reportDate
  }

  return payload
}

export const getStatusTone = (status) => {
  if (!status) return 'neutral'
  if (status.enabled) return 'ready'
  return 'unavailable'
}

export const extractFailureCategory = (error) => {
  const directCategory = error?.error?.category || error?.category || error?.failure_category
  if (directCategory) return directCategory

  const message = error?.message || ''
  return Object.keys(providerFailureMessages).find((category) => message.includes(category)) || ''
}

export const getDefaultErrorMessage = (error) => {
  const category = extractFailureCategory(error)
  if (category && providerFailureMessages[category]) return providerFailureMessages[category]
  if (error?.errors?.length) return error.errors[0].message || 'Không gửi được báo cáo doanh thu'
  return error?.message || 'Không gửi được báo cáo doanh thu'
}

export const getStatusLoadErrorMessage = (error) => {
  const message = error?.message || ''
  if (message.includes('Khong co quyen') || message.includes('quyền')) {
    return 'Bạn không có quyền xem trạng thái gửi email.'
  }
  return 'Không tải được trạng thái gửi email.'
}

export const createSuccessStatus = (current, result) => ({
  ...(current || {}),
  enabled: true,
  status: result?.status,
  last_attempt: result,
})

export const runImmediateSendFlow = async ({
  recipientEmail,
  reportDate = '',
  isSubmitting = false,
  sendDailyRevenueEmailNow,
}) => {
  if (isSubmitting) {
    return {
      blocked: true,
      didSend: false,
      validationError: '',
      failureMessage: '',
      payload: null,
      result: null,
    }
  }

  const validationError = validateEmail(recipientEmail)
  if (validationError) {
    return {
      blocked: false,
      didSend: false,
      validationError,
      failureMessage: '',
      payload: null,
      result: null,
    }
  }

  const payload = buildImmediateSendPayload({ recipientEmail, reportDate })

  try {
    const response = await sendDailyRevenueEmailNow(payload)
    return {
      blocked: false,
      didSend: true,
      validationError: '',
      failureMessage: '',
      payload,
      result: response.data,
    }
  } catch (error) {
    return {
      blocked: false,
      didSend: false,
      validationError: '',
      failureMessage: getDefaultErrorMessage(error),
      payload,
      result: null,
    }
  }
}
