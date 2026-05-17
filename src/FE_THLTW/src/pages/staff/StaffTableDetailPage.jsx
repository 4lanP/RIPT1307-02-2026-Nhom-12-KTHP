import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { staffApi } from '../../lib/api'
import { useAuth } from '../../contexts/AuthContext'
import { formatCurrency, formatDateShort, getStatusLabel, getStatusClass } from '../../lib/utils'
import ModalPortal from '../../components/ModalPortal'
import {
  ArrowLeft, CreditCard, X, AlertTriangle, DollarSign,
  Clock, CheckCircle, UtensilsCrossed, RefreshCw, Table2
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
      toast.error('Không có phiên hoạt động')
      navigate('/tables')
    } finally {
      setLoading(false)
    }
  }

  const handleCheckout = async () => {
    const amtNum = parseInt(amount)
    if (!amtNum || amtNum < (session?.final_amount || 0)) {
      toast.error(`Số tiền không đủ`)
      return
    }
    setProcessing(true)
    try {
      await staffApi.checkout(session.id, amtNum)
      toast.success(`✅ Đã thanh toán!`)
      navigate('/tables')
    } catch (err) {
      toast.error('Thanh toán thất bại')
    } finally {
      setProcessing(false)
    }
  }

  const handleForceClose = async () => {
    if (!confirm('Đóng phiên khẩn cấp?')) return
    setForceClosing(true)
    try {
      await staffApi.forceClose(session.id)
      toast.success('Đã đóng phiên')
      navigate('/tables')
    } catch { toast.error('Lỗi') }
    finally { setForceClosing(false) }
  }

  const handleCancelItem = async (itemId) => {
    if (!confirm('Hủy món này?')) return
    try {
      await staffApi.cancelItem(itemId)
      toast.success('Đã hủy món')
      loadSession()
    } catch { toast.error('Lỗi') }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-40">
        <div className="w-10 h-10 border-4 border-emerald-50 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (!session) return null

  const finalAmount = session.final_amount || session.subtotal || 0
  const change = amount ? Math.max(0, parseInt(amount) - finalAmount) : 0
  const allItems = session.orders?.flatMap(o => (o.items || []).map(i => ({ ...i, orderId: o.id }))) || []

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-20">
      {/* Header Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/tables')}
          className="flex items-center gap-2 text-gray-500 hover:text-emerald-600 transition-colors font-bold uppercase text-[10px] tracking-widest bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại sơ đồ
        </button>
        <div className="flex gap-2">
          <button onClick={loadSession} className="w-10 h-10 bg-white border border-gray-100 rounded-xl flex items-center justify-center text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 transition-all shadow-sm">
            <RefreshCw className="w-4 h-4" />
          </button>
          {(isAdmin || isManager) && (
            <button
              onClick={handleForceClose}
              disabled={forceClosing}
              className="flex items-center gap-2 bg-red-50 text-red-500 border border-red-100 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all shadow-sm disabled:opacity-50"
            >
              <AlertTriangle className="w-4 h-4" />
              Đóng khẩn cấp
            </button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-8">
          {/* Table Stats Header */}
          <div className="bg-white rounded-[40px] p-8 border border-gray-100 shadow-sm relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50/50 rounded-full -mr-16 -mt-16 blur-2xl" />
             <div className="relative flex items-center justify-between mb-8">
               <div className="flex items-center gap-5">
                 <div className="w-16 h-16 bg-emerald-500 text-white rounded-[24px] flex items-center justify-center shadow-lg shadow-emerald-500/20">
                   <Table2 className="w-8 h-8" />
                 </div>
                 <div>
                   <h1 className="text-3xl font-black text-gray-900 tracking-tight">{session.table_name || `Bàn ${id}`}</h1>
                   <div className="flex items-center gap-2 mt-1">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Bắt đầu: {formatDateShort(session.started_at)}</span>
                   </div>
                 </div>
               </div>
               <div className="text-right">
                 <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-widest border border-emerald-100">Đang hoạt động</span>
               </div>
             </div>

             <div className="grid grid-cols-2 gap-4">
               <div className="bg-[#F9FBF9] p-6 rounded-[28px] border border-gray-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Tạm tính</p>
                  <p className="text-2xl font-black text-gray-900">{formatCurrency(session.subtotal || 0)}</p>
               </div>
               <div className="bg-emerald-600 p-6 rounded-[28px] shadow-lg shadow-emerald-600/20">
                  <p className="text-[10px] font-black text-emerald-50/70 uppercase tracking-widest mb-1">Cần thanh toán</p>
                  <p className="text-2xl font-black text-white">{formatCurrency(finalAmount)}</p>
               </div>
             </div>
          </div>

          {/* Orders Table */}
          <div className="bg-white rounded-[40px] p-8 border border-gray-100 shadow-sm">
            <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-3">
              <UtensilsCrossed className="w-6 h-6 text-emerald-500" />
              Chi tiết gọi món
            </h2>
            
            {allItems.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-[32px] border border-dashed border-gray-200">
                 <p className="text-gray-400 font-bold">Chưa có món nào được đặt</p>
              </div>
            ) : (
              <div className="overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-50">
                      <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Trạng thái</th>
                      <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Tên món</th>
                      <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Số lượng</th>
                      <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Đơn giá</th>
                      <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {allItems.map(item => (
                      <tr key={item.id} className="group">
                        <td className="py-5">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${getStatusClass(item.status)}`}>
                            {getStatusLabel(item.status)}
                          </span>
                        </td>
                        <td className="py-5">
                          <p className="text-gray-900 font-bold text-sm">{item.menu_item_name || item.name}</p>
                          {item.note && <p className="text-amber-600 text-[10px] font-medium mt-0.5 italic">Note: {item.note}</p>}
                        </td>
                        <td className="py-5 text-center">
                          <span className="text-gray-900 font-black text-xs bg-gray-50 w-8 h-8 rounded-lg inline-flex items-center justify-center border border-gray-100">
                            {item.quantity}
                          </span>
                        </td>
                        <td className="py-5 text-right font-black text-gray-900 text-sm">
                          {formatCurrency(item.price * item.quantity)}
                        </td>
                        <td className="py-5 text-right">
                          {!['SERVED', 'CANCELLED'].includes(item.status) && (
                            <button
                              onClick={() => handleCancelItem(item.id)}
                              className="w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Checkout Sidebar */}
        <div className="space-y-8">
          <div className="bg-white rounded-[40px] p-8 border border-gray-100 shadow-sm sticky top-24">
            <h2 className="text-xl font-black text-gray-900 mb-8 flex items-center gap-3">
              <CreditCard className="w-6 h-6 text-emerald-500" />
              Thanh toán
            </h2>

            <div className="space-y-6">
              <div className="bg-emerald-50 p-6 rounded-[28px] border border-emerald-100">
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Cần thu của khách</p>
                <p className="text-3xl font-black text-emerald-700">{formatCurrency(finalAmount)}</p>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Số tiền khách đưa</label>
                <div className="relative">
                  <DollarSign className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    min={finalAmount}
                    className="w-full bg-[#F9FBF9] border border-gray-100 rounded-[20px] pl-12 pr-6 py-4 text-xl font-black text-gray-900 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
                    placeholder={String(finalAmount)}
                  />
                </div>
              </div>

              {/* Suggestions */}
              <div className="grid grid-cols-2 gap-2">
                {[finalAmount, Math.ceil(finalAmount / 50000) * 50000, Math.ceil(finalAmount / 100000) * 100000, Math.ceil(finalAmount / 500000) * 500000].filter((v, i, a) => a.indexOf(v) === i).slice(0, 4).map(amt => (
                  <button
                    key={amt}
                    onClick={() => setAmount(String(amt))}
                    className="py-3 px-2 rounded-xl text-[10px] font-black text-gray-500 border border-gray-100 hover:bg-white hover:border-emerald-200 hover:text-emerald-600 hover:shadow-sm transition-all text-center uppercase tracking-tighter"
                  >
                    {formatCurrency(amt)}
                  </button>
                ))}
              </div>

              {amount && parseInt(amount) > finalAmount && (
                <div className="flex items-center justify-between px-2 pt-4 border-t border-gray-50">
                   <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tiền thối lại</span>
                   <span className="text-xl font-black text-emerald-600">{formatCurrency(change)}</span>
                </div>
              )}

              <button
                onClick={() => setCheckoutOpen(true)}
                disabled={!amount || parseInt(amount) < finalAmount}
                className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-100 disabled:text-gray-400 text-white font-black py-5 rounded-[24px] shadow-[0_20px_40px_-10px_rgba(16,185,129,0.4)] flex items-center justify-center gap-3 transition-all hover:-translate-y-1 active:scale-95 mt-4"
              >
                <CheckCircle className="w-6 h-6" strokeWidth={3} />
                <span className="text-lg">Hoàn tất hóa đơn</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Confirm Modal */}
      {checkoutOpen && (
        <ModalPortal>
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md animate-fade-in" onClick={() => setCheckoutOpen(false)} />
          <div className="relative bg-white p-10 rounded-[40px] shadow-2xl w-full max-w-md animate-[bounce-in_0.4s_ease-out]">
            <div className="w-20 h-20 bg-emerald-50 rounded-[32px] flex items-center justify-center mx-auto mb-6 shadow-sm border border-emerald-100 text-emerald-500">
               <CreditCard className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black text-center text-gray-900 mb-8 tracking-tight">Xác nhận thanh toán</h3>
            <div className="bg-[#F9FBF9] rounded-[32px] p-6 space-y-4 mb-10 border border-gray-50">
              <div className="flex justify-between items-center text-sm font-bold">
                <span className="text-gray-400 uppercase tracking-widest text-[10px]">Cần thu</span>
                <span className="text-gray-900 text-lg">{formatCurrency(finalAmount)}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-bold">
                <span className="text-gray-400 uppercase tracking-widest text-[10px]">Đã nhận</span>
                <span className="text-emerald-600 text-lg">{formatCurrency(parseInt(amount))}</span>
              </div>
              <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                <span className="text-gray-400 uppercase tracking-widest text-[10px]">Tiền thừa</span>
                <span className="text-2xl font-black text-gray-900">{formatCurrency(change)}</span>
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setCheckoutOpen(false)} className="flex-1 py-4 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-colors">
                Hủy bỏ
              </button>
              <button
                onClick={handleCheckout}
                disabled={processing}
                className="flex-[2] bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                {processing ? <div className="w-5 h-5 border-4 border-white/30 border-t-white rounded-full animate-spin" /> : 'Xác nhận thu tiền'}
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  )
}

export default StaffTableDetailPage
