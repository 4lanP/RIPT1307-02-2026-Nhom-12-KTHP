import React, { useState, useEffect } from 'react'
import { staffApi } from '../../lib/api'
import { formatDateShort, getStatusLabel } from '../../lib/utils'
import { Bell, CheckCircle, RefreshCw, Filter } from 'lucide-react'
import toast from 'react-hot-toast'

const REQUEST_TYPES = {
  CALL_STAFF: { label: 'Gọi nhân viên', emoji: '🔔', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  REQUEST_BILL: { label: 'Xin thanh toán', emoji: '💳', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  OTHER: { label: 'Yêu cầu khác', emoji: '❓', color: 'text-gray-400', bg: 'bg-gray-500/10' },
}

const StaffRequestsPage = () => {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [resolving, setResolving] = useState({})

  useEffect(() => {
    loadRequests()
    const interval = setInterval(loadRequests, 20000)
    return () => clearInterval(interval)
  }, [])

  const loadRequests = async () => {
    try {
      const res = await staffApi.getRequests()
      setRequests(res.data || [])
    } catch { toast.error('Không tải được yêu cầu') }
    finally { setLoading(false) }
  }

  const handleResolve = async (id) => {
    setResolving(p => ({ ...p, [id]: true }))
    try {
      await staffApi.resolveRequest(id)
      setRequests(prev => prev.filter(r => r.id !== id))
      toast.success('Đã xử lý yêu cầu')
    } catch { toast.error('Không thể xử lý') }
    finally { setResolving(p => ({ ...p, [id]: false })) }
  }

  const billRequests = requests.filter(r => r.request_type === 'REQUEST_BILL')
  const callRequests = requests.filter(r => r.request_type === 'CALL_STAFF')
  const otherRequests = requests.filter(r => r.request_type === 'OTHER')

  return (
    <div className="page-container max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="section-title mb-0 flex items-center gap-2">
            <Bell className="w-6 h-6 text-orange-400" />
            Yêu cầu từ khách
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {requests.length} yêu cầu đang chờ xử lý
          </p>
        </div>
        <button onClick={loadRequests} className="btn-secondary btn-sm flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          Làm mới
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="glass-card p-4 text-center">
          <p className="text-3xl font-black text-yellow-400">{callRequests.length}</p>
          <p className="text-gray-400 text-sm mt-1">🔔 Gọi nhân viên</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-3xl font-black text-blue-400">{billRequests.length}</p>
          <p className="text-gray-400 text-sm mt-1">💳 Xin thanh toán</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-3xl font-black text-gray-400">{otherRequests.length}</p>
          <p className="text-gray-400 text-sm mt-1">❓ Khác</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-card p-5 animate-pulse">
              <div className="h-5 bg-white/10 rounded w-1/3 mb-2" />
              <div className="h-4 bg-white/10 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-20">
          <CheckCircle className="w-16 h-16 mx-auto mb-4 text-emerald-500/40" />
          <h3 className="text-gray-400 font-semibold text-lg">Không có yêu cầu nào</h3>
          <p className="text-gray-600 text-sm mt-1">Tất cả yêu cầu đã được xử lý</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Bill requests first */}
          {[...billRequests, ...callRequests, ...otherRequests].map(req => {
            const typeInfo = REQUEST_TYPES[req.request_type] || REQUEST_TYPES.OTHER
            return (
              <div key={req.id} className={`glass-card p-5 flex items-center justify-between gap-4 border-l-4 ${
                req.request_type === 'REQUEST_BILL' ? 'border-l-blue-500' :
                req.request_type === 'CALL_STAFF' ? 'border-l-yellow-500' :
                'border-l-gray-500'
              } animate-slide-in`}>
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl ${typeInfo.bg} flex items-center justify-center text-2xl flex-shrink-0`}>
                    {typeInfo.emoji}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`font-semibold text-sm ${typeInfo.color}`}>{typeInfo.label}</span>
                      {req.table_name && (
                        <span className="text-gray-400 text-sm">— {req.table_name}</span>
                      )}
                    </div>
                    <p className="text-gray-500 text-xs">{formatDateShort(req.created_at)}</p>
                    {req.note && <p className="text-gray-400 text-xs mt-0.5 italic">"{req.note}"</p>}
                  </div>
                </div>
                <button
                  onClick={() => handleResolve(req.id)}
                  disabled={resolving[req.id]}
                  className="btn-success btn-sm flex items-center gap-1.5 flex-shrink-0"
                >
                  {resolving[req.id] ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  Đã xử lý
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default StaffRequestsPage
