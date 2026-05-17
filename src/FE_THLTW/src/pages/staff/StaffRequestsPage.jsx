import React, { useState, useEffect } from 'react'
import { staffApi } from '../../lib/api'
import { formatDateShort } from '../../lib/utils'
import { Bell, CheckCircle, RefreshCw, Layers, Clock, MessageCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const REQUEST_TYPES = {
  CALL_STAFF: { label: 'Gọi nhân viên', icon: Bell, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
  REQUEST_BILL: { label: 'Xin thanh toán', icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
  OTHER: { label: 'Yêu cầu khác', icon: MessageCircle, color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-100' },
}

const StaffRequestsPage = () => {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [resolving, setResolving] = useState({})

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

  const handleResolve = async (id) => {
    setResolving(p => ({ ...p, [id]: true }))
    try {
      await staffApi.resolveRequest(id)
      setRequests(prev => prev.filter(r => r.id !== id))
      toast.success('Đã xử lý yêu cầu', { position: 'bottom-right' })
    } catch { toast.error('Lỗi xử lý') }
    finally { setResolving(p => ({ ...p, [id]: false })) }
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
                  
                  <button
                    onClick={() => handleResolve(req.id)}
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
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default StaffRequestsPage
