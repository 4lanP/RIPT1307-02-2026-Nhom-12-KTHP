import React, { useState, useEffect } from 'react'
import { staffApi } from '../../lib/api'
import { formatCurrency, formatDateShort } from '../../lib/utils'
import { Bell, CheckCircle, RefreshCw, Layers, Clock, MessageCircle, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'
import ModalPortal from '../../components/ModalPortal'

const REQUEST_TYPES = {
  CALL_STAFF: { label: 'Gọi nhân viên', icon: Bell, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
  REQUEST_BILL: { label: 'Xin thanh toán', icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
  OTHER: { label: 'Yêu cầu khác', icon: MessageCircle, color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-100' },
}

const StaffRequestsPage = () => {
  const { user, isAdmin, isManager } = useAuth()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [resolving, setResolving] = useState({})
  
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [selectedSession, setSelectedSession] = useState(null)
  const [loadingSession, setLoadingSession] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [processing, setProcessing] = useState(false)

  const canCheckout = isAdmin || isManager || user?.role === 'CASHIER'

  useEffect(() => {
    loadRequests()
    const interval = setInterval(loadRequests, 10000)
    return () => clearInterval(interval)
  }, [])

  const loadRequests = async () => {
    try {
      const res = await staffApi.getRequests()
      setRequests(res.data || [])
    } catch { toast.error('Lỗi tải dữ liệu') }
    finally { setLoading(false) }
  }

  const handleResolve = async (req) => {
    setResolving(p => ({ ...p, [req.id]: true }))
    try {
      await staffApi.resolveRequest(req.id)
      
      let tableCleared = false
      if (req.request_type === 'REQUEST_BILL' && req.session_id) {
        try {
          await staffApi.forceClose(req.session_id)
          tableCleared = true
        } catch {
          try {
            await staffApi.checkout(req.session_id, 0)
            tableCleared = true
          } catch {
            // Both failed due to role/other issues
          }
        }
      }
      
      setRequests(prev => prev.filter(r => r.id !== req.id))
      
      if (tableCleared) {
        toast.success(`Đã xử lý & Giải phóng ${req.table_name || 'bàn'} thành công!`, { position: 'bottom-right' })
      } else if (req.request_type === 'REQUEST_BILL') {
        toast.success('Đã nhận yêu cầu. Vui lòng nhờ Thu ngân/Quản lý giải phóng bàn.', { position: 'bottom-right', duration: 4000 })
      } else {
        toast.success('Đã xử lý yêu cầu', { position: 'bottom-right' })
      }
    } catch { 
      toast.error('Lỗi xử lý') 
    } finally { 
      setResolving(p => ({ ...p, [req.id]: false })) 
    }
  }

  const openCheckoutModal = async (req) => {
    setSelectedRequest(req)
    setCheckoutOpen(true)
    setLoadingSession(true)
    setAmount('')
    setSelectedSession(null)
    
    try {
      const tablesRes = await staffApi.getTables()
      const tables = tablesRes.data || []
      const matchingTable = tables.find(t => String(t.active_session_id) === String(req.session_id))
      
      if (!matchingTable) {
        throw new Error('Table session not found')
      }
      
      const sessionRes = await staffApi.getTableSession(matchingTable.table_id)
      setSelectedSession(sessionRes.data)
      setAmount('')
    } catch {
      toast.error('Không tìm thấy thông tin phiên hóa đơn của bàn này')
      setCheckoutOpen(false)
    } finally {
      setLoadingSession(false)
    }
  }

  const handleCheckoutAndResolve = async () => {
    if (!selectedSession || !selectedRequest) return
    const amtNum = parseInt(amount)
    const finalAmount = selectedSession.final_amount || selectedSession.subtotal || 0
    
    if (isNaN(amtNum) || amtNum < finalAmount) {
      toast.error('Số tiền không đủ')
      return
    }
    
    setProcessing(true)
    try {
      if (canCheckout) {
        await staffApi.checkout(selectedSession.id, amtNum)
        await staffApi.resolveRequest(selectedRequest.id)
        toast.success(`✅ Đã thanh toán & Giải phóng ${selectedRequest.table_name || 'bàn'}!`)
      } else {
        await staffApi.resolveRequest(selectedRequest.id)
        toast.success(`✅ Đã ghi nhận thu hộ & xử lý yêu cầu cho ${selectedRequest.table_name || 'bàn'}! Hãy bàn giao tiền cho Thu ngân.`)
      }
      setCheckoutOpen(false)
      loadRequests()
    } catch {
      toast.error('Thao tác thất bại')
    } finally {
      setProcessing(false)
    }
  }

  const billRequests = requests.filter(r => r.request_type === 'REQUEST_BILL')
  const callRequests = requests.filter(r => r.request_type === 'CALL_STAFF')

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Trung Tâm Yêu Cầu</h1>
          <p className="text-gray-400 font-medium mt-1 text-base">Có <span className="text-emerald-600 font-black">{requests.length} thông báo</span> mới cần xử lý ngay.</p>
        </div>
        <button onClick={loadRequests} className="w-14 h-14 bg-white border border-gray-100 rounded-[22px] flex items-center justify-center text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 transition-all shadow-sm">
          <RefreshCw className="w-6 h-6" />
        </button>
      </div>

      {/* Quick Stats Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-amber-500 p-8 rounded-[40px] shadow-lg shadow-amber-500/20 text-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl group-hover:scale-110 transition-transform" />
          <Bell className="w-10 h-10 mb-6 opacity-80" />
          <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Cần hỗ trợ</p>
          <p className="text-4xl font-black">{callRequests.length}</p>
        </div>
        
        <div className="bg-emerald-600 p-8 rounded-[40px] shadow-lg shadow-emerald-600/20 text-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl group-hover:scale-110 transition-transform" />
          <CheckCircle className="w-10 h-10 mb-6 opacity-80" />
          <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Chờ tính tiền</p>
          <p className="text-4xl font-black">{billRequests.length}</p>
        </div>

        <div className="bg-gray-900 p-8 rounded-[40px] shadow-lg shadow-gray-900/20 text-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl group-hover:scale-110 transition-transform" />
          <Layers className="w-10 h-10 mb-6 opacity-80" />
          <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Khác</p>
          <p className="text-4xl font-black">{requests.length - billRequests.length - callRequests.length}</p>
        </div>
      </div>

      {/* Main List */}
      <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
        {loading ? (
          <div className="flex items-center justify-center py-40">
            <div className="w-10 h-10 border-4 border-emerald-50 border-t-emerald-500 rounded-full animate-spin" />
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-40 opacity-40">
             <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-[32px] flex items-center justify-center mb-6">
                <CheckCircle className="w-12 h-12" strokeWidth={3} />
             </div>
             <p className="text-2xl font-black text-gray-900 uppercase tracking-widest">Tất cả đã xong!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {[...billRequests, ...callRequests, ...requests.filter(r => r.request_type === 'OTHER')].map(req => {
              const typeInfo = REQUEST_TYPES[req.request_type] || REQUEST_TYPES.OTHER
              return (
                <div key={req.id} className="p-8 flex items-center justify-between gap-6 group hover:bg-[#F9FBF9] transition-colors">
                  <div className="flex items-center gap-6">
                    <div className={`w-16 h-16 rounded-[24px] ${typeInfo.bg} border ${typeInfo.border} flex items-center justify-center ${typeInfo.color} shadow-sm group-hover:scale-105 transition-transform`}>
                      <typeInfo.icon className="w-8 h-8" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${typeInfo.bg} ${typeInfo.color} border ${typeInfo.border}`}>
                          {typeInfo.label}
                        </span>
                        <span className="text-xl font-black text-gray-900 tracking-tight">{req.table_name || 'Bàn Khách'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">{formatDateShort(req.created_at)}</span>
                        {req.note && (
                          <>
                            <span className="text-gray-200">|</span>
                            <span className="text-gray-500 text-xs font-medium italic">"{req.note}"</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {req.request_type === 'REQUEST_BILL' ? (
                    <button
                      onClick={() => openCheckoutModal(req)}
                      disabled={resolving[req.id]}
                      className="h-14 px-8 bg-emerald-500 text-white border border-emerald-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-emerald-600 hover:shadow-md hover:shadow-emerald-500/10 transition-all flex items-center gap-3 group/btn active:scale-95 shadow-sm"
                    >
                      <CheckCircle className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                      <span>Thanh toán</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleResolve(req)}
                      disabled={resolving[req.id]}
                      className="h-14 px-8 bg-white border border-gray-100 rounded-2xl text-xs font-black uppercase tracking-widest text-gray-400 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50 hover:shadow-sm transition-all flex items-center gap-3 group/btn active:scale-95"
                    >
                      {resolving[req.id] ? (
                        <div className="w-4 h-4 border-3 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                          <span>Xác nhận xong</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Checkout Modal on Requests Page */}
      {checkoutOpen && selectedRequest && (
        <ModalPortal>
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 animate-fade-in">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md animate-fade-in" onClick={() => !processing && setCheckoutOpen(false)} />
          <div className="relative bg-white rounded-[40px] shadow-2xl w-full max-w-md animate-[bounce-in_0.4s_ease-out] overflow-hidden flex flex-col">
            <div className="px-10 py-8 border-b border-gray-50 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">Thanh toán & Giải phóng</h3>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">{selectedRequest.table_name || 'Bàn Khách'}</p>
              </div>
              <button onClick={() => !processing && setCheckoutOpen(false)} className="w-10 h-10 bg-gray-50 text-gray-400 hover:text-gray-900 rounded-xl flex items-center justify-center transition-all">
                <X className="w-5 h-5" strokeWidth={3} />
              </button>
            </div>
            
            {loadingSession ? (
              <div className="p-20 flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-emerald-50 border-t-emerald-500 rounded-full animate-spin" />
              </div>
            ) : selectedSession ? (
              <>
                <div className="p-10 space-y-6">
                  {/* Bill Summary */}
                  <div className="bg-emerald-50 p-6 rounded-[28px] border border-emerald-100">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Cần thu của khách</p>
                    <p className="text-3xl font-black text-emerald-700">
                      {formatCurrency(selectedSession.final_amount || selectedSession.subtotal || 0)}
                    </p>
                  </div>

                  {/* Cash Calculator (always visible and functional for all roles!) */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Số tiền khách đưa</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        min={selectedSession.final_amount || selectedSession.subtotal || 0}
                        className="w-full bg-[#F9FBF9] border border-gray-100 rounded-[20px] px-6 py-4 text-xl font-black text-gray-900 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-center"
                        placeholder="Nhập số tiền..."
                      />
                    </div>
                  </div>

                  {/* Suggestions */}
                  <div className="grid grid-cols-3 gap-2">
                    {(() => {
                      const finalAmt = selectedSession.final_amount || selectedSession.subtotal || 0
                      return [finalAmt, Math.ceil(finalAmt / 50000) * 50000, Math.ceil(finalAmt / 100000) * 100000].filter((v, i, a) => a.indexOf(v) === i).slice(0, 3).map(amt => (
                        <button
                          key={amt}
                          onClick={() => setAmount(String(amt))}
                          className="py-3 px-1 rounded-xl text-[10px] font-black text-gray-500 border border-gray-100 hover:bg-white hover:border-emerald-200 hover:text-emerald-600 hover:shadow-sm transition-all text-center uppercase tracking-tighter"
                        >
                          {formatCurrency(amt)}
                        </button>
                      ))
                    })()}
                  </div>

                  {amount && parseInt(amount) > (selectedSession.final_amount || selectedSession.subtotal || 0) && (
                    <div className="flex items-center justify-between px-2 pt-2 border-t border-gray-50">
                       <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tiền thối lại</span>
                       <span className="text-xl font-black text-emerald-600">
                         {formatCurrency(parseInt(amount) - (selectedSession.final_amount || selectedSession.subtotal || 0))}
                       </span>
                    </div>
                  )}

                  {!canCheckout && (
                    <div className="bg-amber-50 border border-amber-100 text-amber-700 p-5 rounded-[24px] text-xs font-bold leading-relaxed">
                      💡 Bạn đang đăng nhập với quyền Phục vụ. Bạn có thể sử dụng bảng tính này để tính tiền thối cho khách, sau đó bấm nút xác nhận bên dưới để hoàn tất xử lý yêu cầu.
                      <p className="mt-2 text-amber-800 font-extrabold">⚠️ Đừng quên bàn giao lại số tiền {amount ? formatCurrency(parseInt(amount)) : 'đã thu'} cho Thu ngân để đóng bàn chính thức.</p>
                    </div>
                  )}
                </div>

                <div className="px-10 py-8 bg-gray-50 flex gap-4">
                  <button onClick={() => setCheckoutOpen(false)} className="flex-1 py-4 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-colors">
                    Hủy bỏ
                  </button>
                  <button
                    onClick={handleCheckoutAndResolve}
                    disabled={processing || !amount || parseInt(amount) < (selectedSession.final_amount || selectedSession.subtotal || 0)}
                    className="flex-[2] bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-200 text-white font-black py-4 rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all active:scale-95 text-xs font-black uppercase tracking-widest"
                  >
                    {processing ? (
                      <div className="w-5 h-5 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : canCheckout ? (
                      'Xác nhận thu tiền'
                    ) : (
                      'Xác nhận đã thu hộ'
                    )}
                  </button>
                </div>
              </>
            ) : (
              <div className="p-10 text-center text-gray-400 font-bold text-sm">
                Không thể tải thông tin phiên hóa đơn của bàn.
              </div>
            )}
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  )
}

export default StaffRequestsPage
