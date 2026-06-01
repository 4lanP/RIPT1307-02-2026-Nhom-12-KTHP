import React, { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { AlertCircle, CheckCircle2, Mail, RefreshCw, Send } from 'lucide-react'
import { adminApi } from '../../lib/api'

type SendResult = {
  attempt_id?: string
  report_date?: string
  recipient_email?: string
  status?: string
  failure_category?: string | null
  total_revenue?: number
  transaction_count?: number
}

type EmailStatus = {
  enabled?: boolean
  status?: string
  startup_error?: string | null
  last_attempt?: SendResult
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const formatCurrency = (value: number | undefined) => new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
}).format(Number(value) || 0)

const getDefaultErrorMessage = (error: any) => {
  const message = error?.message || 'Không gửi được báo cáo doanh thu'
  if (message.includes('provider-timeout')) return 'Nhà cung cấp email phản hồi quá thời gian.'
  if (message.includes('provider-auth')) return 'Cấu hình xác thực email chưa hợp lệ.'
  if (message.includes('provider-rejected')) return 'Nhà cung cấp email đã từ chối yêu cầu gửi.'
  if (message.includes('provider-rate-limit')) return 'Nhà cung cấp email đang giới hạn lượt gửi.'
  if (error?.errors?.length) return error.errors[0].message || message
  return message
}

const validateEmail = (value: string) => {
  const normalized = value.trim().toLowerCase()
  if (!normalized) return 'Vui lòng nhập email nhận báo cáo.'
  if (!emailPattern.test(normalized)) return 'Email nhận báo cáo không hợp lệ.'
  if (normalized.includes(',')) return 'Chỉ được gửi đến một email mỗi lần.'
  return ''
}

const AdminEmailSendPage = () => {
  const [recipientEmail, setRecipientEmail] = useState('')
  const [reportDate, setReportDate] = useState('')
  const [validationError, setValidationError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isStatusLoading, setIsStatusLoading] = useState(false)
  const [status, setStatus] = useState<EmailStatus | null>(null)
  const [lastResult, setLastResult] = useState<SendResult | null>(null)
  const [failureMessage, setFailureMessage] = useState('')

  const statusTone = useMemo(() => {
    if (!status) return 'neutral'
    if (status.enabled) return 'ready'
    return 'unavailable'
  }, [status])

  const loadStatus = async () => {
    setIsStatusLoading(true)
    try {
      const response = await adminApi.getDailyRevenueEmailStatus()
      setStatus(response.data || null)
    } catch (error: any) {
      if (error?.message?.includes('Khong co quyen') || error?.message?.includes('quyền')) {
        setFailureMessage('Bạn không có quyền xem trạng thái gửi email.')
      } else {
        setFailureMessage('Không tải được trạng thái gửi email.')
      }
    } finally {
      setIsStatusLoading(false)
    }
  }

  useEffect(() => {
    loadStatus()
  }, [])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (isSubmitting) return

    const emailError = validateEmail(recipientEmail)
    if (emailError) {
      setValidationError(emailError)
      setLastResult(null)
      return
    }

    setValidationError('')
    setFailureMessage('')
    setIsSubmitting(true)

    try {
      const payload: Record<string, string> = {
        recipient_email: recipientEmail.trim().toLowerCase(),
      }
      if (reportDate) {
        payload.report_date = reportDate
      }

      const response = await adminApi.sendDailyRevenueEmailNow(payload)
      setLastResult(response.data)
      setStatus((current) => ({
        ...(current || {}),
        enabled: true,
        status: response.data?.status,
        last_attempt: response.data,
      }))
      toast.success('Đã gửi báo cáo doanh thu')
    } catch (error: any) {
      const message = getDefaultErrorMessage(error)
      setFailureMessage(message)
      setLastResult(null)
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gửi báo cáo doanh thu</h1>
            <p className="text-sm text-gray-500">Gửi ngay báo cáo doanh thu ngày đến một email nhận thử.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6 items-start">
        <form onSubmit={handleSubmit} className="bg-white border border-gray-100 rounded-[8px] shadow-sm p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-gray-700">Email nhận báo cáo</span>
              <input
                value={recipientEmail}
                onChange={(event) => {
                  setRecipientEmail(event.target.value)
                  if (validationError) setValidationError('')
                }}
                placeholder="admin@example.com"
                className="h-11 rounded-[8px] border border-gray-200 px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500"
                autoComplete="email"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-gray-700">Ngày báo cáo</span>
              <input
                type="date"
                value={reportDate}
                onChange={(event) => setReportDate(event.target.value)}
                className="h-11 rounded-[8px] border border-gray-200 px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500"
              />
            </label>
          </div>

          {!reportDate && (
            <p className="text-sm text-gray-500">Nếu để trống ngày, hệ thống dùng ngày kinh doanh đã hoàn tất gần nhất.</p>
          )}

          {validationError && (
            <div className="flex items-start gap-2 rounded-[8px] border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {failureMessage && (
            <div className="flex items-start gap-2 rounded-[8px] border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{failureMessage}</span>
            </div>
          )}

          {lastResult && (
            <div className="rounded-[8px] border border-emerald-100 bg-emerald-50 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-1 text-sm">
                  <p className="font-semibold text-emerald-900">Đã gửi báo cáo đến {lastResult.recipient_email}</p>
                  <p className="text-emerald-700">Ngày báo cáo: {lastResult.report_date}</p>
                  <p className="text-emerald-700">
                    Tổng doanh thu: {formatCurrency(lastResult.total_revenue)} · {lastResult.transaction_count || 0} giao dịch
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-[8px] bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {isSubmitting ? 'Đang gửi' : 'Gửi báo cáo'}
            </button>
            <button
              type="button"
              onClick={loadStatus}
              disabled={isStatusLoading}
              className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-[8px] border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 disabled:opacity-60 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isStatusLoading ? 'animate-spin' : ''}`} />
              Tải lại trạng thái
            </button>
          </div>
        </form>

        <aside className="bg-white border border-gray-100 rounded-[8px] shadow-sm p-5 space-y-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">Trạng thái email</h2>
            <p className="text-sm text-gray-500">Thông tin an toàn cho vận hành gần đây.</p>
          </div>

          <div className={`rounded-[8px] border px-3 py-2 text-sm ${
            statusTone === 'ready'
              ? 'border-emerald-100 bg-emerald-50 text-emerald-800'
              : statusTone === 'unavailable'
                ? 'border-amber-100 bg-amber-50 text-amber-800'
                : 'border-gray-100 bg-gray-50 text-gray-600'
          }`}>
            {isStatusLoading && 'Đang tải trạng thái...'}
            {!isStatusLoading && statusTone === 'ready' && 'Email đã sẵn sàng để gửi.'}
            {!isStatusLoading && statusTone === 'unavailable' && 'Cấu hình email chưa sẵn sàng.'}
            {!isStatusLoading && statusTone === 'neutral' && 'Chưa có trạng thái email.'}
          </div>

          {status?.last_attempt && (
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-gray-500">Lần gửi gần nhất</dt>
                <dd className="font-semibold text-gray-900">{status.last_attempt.status}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Ngày báo cáo</dt>
                <dd className="font-semibold text-gray-900">{status.last_attempt.report_date || '-'}</dd>
              </div>
              {status.last_attempt.recipient_email && (
                <div>
                  <dt className="text-gray-500">Email nhận</dt>
                  <dd className="font-semibold text-gray-900 break-all">{status.last_attempt.recipient_email}</dd>
                </div>
              )}
              {status.last_attempt.failure_category && (
                <div>
                  <dt className="text-gray-500">Lỗi</dt>
                  <dd className="font-semibold text-amber-700">{status.last_attempt.failure_category}</dd>
                </div>
              )}
            </dl>
          )}
        </aside>
      </div>
    </div>
  )
}

export default AdminEmailSendPage
