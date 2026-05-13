import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { staffApi } from '../../lib/api'
import { useAuth } from '../../contexts/AuthContext'
import { formatCurrency, formatDateShort, getStatusLabel, getStatusClass } from '../../lib/utils'
import {
  ArrowLeft, CreditCard, X, AlertTriangle, DollarSign,
  Clock, CheckCircle, UtensilsCrossed, RefreshCw
} from 'lucide-react'
import toast from 'react-hot-toast'

const StaffTableDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAdmin, isManager } = useAuth()
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [processing, setProcessing] = useState(false)
  const [forceClosing, setForceClosing] = useState(false)

  useEffect(() => {
    loadSession()
  }, [id])

  const loadSession = async () => {
    setLoading(true)
    try {
      const res = await staffApi.getTableSession(id)
      setSession(res.data)
      setAmount(String(res.data?.final_amount || res.data?.subtotal || ''))
    } catch {
      toast.error('Không có phiên hoạt động cho bàn này')
      navigate('/tables')
    } finally {
      setLoading(false)
    }
  }

  const handleCheckout = async () => {
    const amtNum = parseInt(amount)
    if (!amtNum || amtNum < (session?.final_amount || 0)) {
      toast.error(`Số tiền phải ≥ ${formatCurrency(session?.final_amount || 0)}`)
      return
    }
    setProcessing(true)
    try {
      await staffApi.checkout(session.id, amtNum)
      const change = amtNum - (session?.final_amount || 0)
      toast.success(`✅ Thanh toán thành công! Tiền thừa: ${formatCurrency(change)}`)
      setCheckoutOpen(false)
      navigate('/tables')
    } catch (err) {
      toast.error(err?.message || 'Thanh toán thất bại')
    } finally {
      setProcessing(false)
    }
  }

  const handleForceClose = async () => {
    if (!confirm('Bạn có chắc muốn đóng phiên khẩn cấp?')) return
    setForceClosing(true)
    try {
      await staffApi.forceClose(session.id)
      toast.success('Đã đóng phiên')
      navigate('/tables')
    } catch { toast.error('Không thể đóng phiên') }
    finally { setForceClosing(false) }
  }

  const handleCancelItem = async (itemId) => {
    if (!confirm('Hủy món này?')) return
    try {
      await staffApi.cancelItem(itemId)
      toast.success('Đã hủy món')
      loadSession()
    } catch { toast.error('Không thể hủy') }
  }

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (!session) return null

  const finalAmount = session.final_amount || session.subtotal || 0
  const change = amount ? Math.max(0, parseInt(amount) - finalAmount) : 0

  // Group orders
  const allItems = session.orders?.flatMap(o => (o.items || []).map(i => ({ ...i, orderId: o.id }))) || []

  return (
    <div className="page-container max-w-4xl">
      {/* Back button */}
      <button
        onClick={() => navigate('/tables')}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6 group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Quay lại
      </button>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Session info */}
        <div className="lg:col-span-2 space-y-4">
          {/* Header */}
          <div className="glass-card p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-white">{session.table_name || `Bàn ${id}`}</h1>
                <p className="text-gray-400 text-sm mt-1">
                  Phiên #{session.id} · Bắt đầu {formatDateShort(session.started_at)}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={loadSession} className="btn-secondary btn-sm">
                  <RefreshCw className="w-4 h-4" />
                </button>
                {(isAdmin || isManager) && (
                  <button
                    onClick={handleForceClose}
                    disabled={forceClosing}
                    className="btn-danger btn-sm flex items-center gap-1"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    Đóng khẩn cấp
                  </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="glass-card p-3">
                <p className="text-gray-400 text-xs">Tạm tính</p>
                <p className="text-white font-bold text-xl">{formatCurrency(session.subtotal || 0)}</p>
              </div>
              <div className="glass-card p-3">
                <p className="text-gray-400 text-xs">Tổng thanh toán</p>
                <p className="text-orange-400 font-bold text-xl">{formatCurrency(finalAmount)}</p>
              </div>
            </div>
          </div>

          {/* Orders */}
          <div className="glass-card p-6">
            <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
              <UtensilsCrossed className="w-5 h-5 text-orange-400" />
              Danh sách món ({allItems.length})
            </h2>
            {allItems.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Chưa có món nào</p>
            ) : (
              <div className="space-y-2">
                {allItems.map(item => (
                  <div key={item.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className={`badge ${getStatusClass(item.status)}`}>
                        {getStatusLabel(item.status)}
                      </span>
                      <div>
                        <p className="text-white text-sm font-medium">{item.menu_item_name || item.name}</p>
                        {item.note && <p className="text-yellow-400/70 text-xs">📝 {item.note}</p>}
                      </div>
                      <span className="text-gray-500 text-sm">x{item.quantity}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-300 text-sm">{formatCurrency(item.price * item.quantity)}</span>
                      {!['SERVED', 'CANCELLED'].includes(item.status) && (
                        <button
                          onClick={() => handleCancelItem(item.id)}
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/30 text-red-400 transition-colors"
                          title="Hủy món"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Checkout */}
        <div className="space-y-4">
          <div className="glass-card p-6">
            <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-400" />
              Thanh toán
            </h2>

            <div className="space-y-4">
              <div>
                <p className="text-gray-400 text-xs mb-1">Tổng cần thanh toán</p>
                <p className="text-2xl font-black text-orange-400">{formatCurrency(finalAmount)}</p>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Số tiền nhận</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    min={finalAmount}
                    step="1000"
                    className="input-field pl-9"
                    placeholder={String(finalAmount)}
                  />
                </div>
              </div>

              {amount && parseInt(amount) > finalAmount && (
                <div className="glass-card p-3 border-emerald-500/30">
                  <p className="text-gray-400 text-xs">Tiền thừa</p>
                  <p className="text-emerald-400 font-bold text-xl">{formatCurrency(change)}</p>
                </div>
              )}

              {/* Quick amounts */}
              <div>
                <p className="text-gray-500 text-xs mb-2">Gợi ý</p>
                <div className="grid grid-cols-2 gap-2">
                  {[finalAmount, Math.ceil(finalAmount / 50000) * 50000, Math.ceil(finalAmount / 100000) * 100000].filter((v, i, a) => a.indexOf(v) === i).slice(0, 4).map(amt => (
                    <button
                      key={amt}
                      onClick={() => setAmount(String(amt))}
                      className="py-2 px-3 rounded-lg text-xs font-medium bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white transition-colors text-center"
                    >
                      {formatCurrency(amt)}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setCheckoutOpen(true)}
                disabled={!amount || parseInt(amount) < finalAmount}
                className="btn-success w-full flex items-center justify-center gap-2 py-4"
                id="checkout-btn"
              >
                <CheckCircle className="w-5 h-5" />
                Thanh toán tiền mặt
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm modal */}
      {checkoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setCheckoutOpen(false)} />
          <div className="relative glass-card p-6 w-full max-w-sm animate-slide-in">
            <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              Xác nhận thanh toán
            </h3>
            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Tổng tiền</span>
                <span className="text-white font-medium">{formatCurrency(finalAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Nhận</span>
                <span className="text-white font-medium">{formatCurrency(parseInt(amount))}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-white/10 pt-2">
                <span className="text-gray-400">Tiền thừa</span>
                <span className="text-emerald-400 font-bold">{formatCurrency(change)}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setCheckoutOpen(false)} className="btn-secondary flex-1">
                Hủy
              </button>
              <button
                onClick={handleCheckout}
                disabled={processing}
                className="btn-success flex-1 flex items-center justify-center gap-2"
              >
                {processing && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StaffTableDetailPage
