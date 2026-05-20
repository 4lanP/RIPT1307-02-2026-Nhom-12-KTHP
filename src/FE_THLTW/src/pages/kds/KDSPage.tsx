import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { kdsApi } from '../../lib/api'
import { useAuth } from '../../contexts/AuthContext'
import { getKitchenSocket } from '../../lib/socket'
import { formatDateShort, getStatusLabel, getStatusClass } from '../../lib/utils'
import { ChefHat, RefreshCw, LogOut, Flame, Wine, Salad, CheckCircle, Clock, PlayCircle, Layers, Bell } from 'lucide-react'
import toast from 'react-hot-toast'

const STATIONS = [
  { value: 'GRILL', label: 'Bếp Nướng', icon: Flame, color: 'bg-orange-50 text-orange-600', border: 'border-orange-100' },
  { value: 'BAR', label: 'Quầy Pha Chế', icon: Wine, color: 'bg-blue-50 text-blue-600', border: 'border-blue-100' },
  { value: 'COLD', label: 'Bếp Salad', icon: Salad, color: 'bg-emerald-50 text-emerald-600', border: 'border-emerald-100' },
]

const STATUS_ACTIONS = {
  PENDING: { next: 'PREPARING', label: 'Bắt đầu', icon: PlayCircle, color: 'bg-emerald-500 text-white hover:bg-emerald-600' },
  PREPARING: { next: 'READY', label: 'Hoàn tất', icon: CheckCircle, color: 'bg-blue-500 text-white hover:bg-blue-600' },
  READY: { next: 'SERVED', label: 'Giao món', icon: ChefHat, color: 'bg-gray-800 text-white hover:bg-black' },
}

const OrderCard = ({ order, onUpdateItem }) => {
  const [updating, setUpdating] = useState({})

  const handleUpdate = async (itemId, newStatus) => {
    setUpdating(p => ({ ...p, [itemId]: true }))
    try {
      await kdsApi.updateItemStatus(itemId, newStatus)
      onUpdateItem(itemId, newStatus)
      toast.success(`Đã cập nhật đơn #${order.id}`, { position: 'bottom-right' })
    } catch { toast.error('Lỗi cập nhật') }
    finally { setUpdating(p => ({ ...p, [itemId]: false })) }
  }

  const items = order.items?.filter(i => !['SERVED', 'CANCELLED'].includes(i.status)) || []
  if (items.length === 0) return null

  return (
    <div className="bg-white border border-gray-100 rounded-[32px] overflow-hidden shadow-sm hover:shadow-md transition-all animate-fade-in flex flex-col">
      {/* Header */}
      <div className="p-5 border-b border-gray-50 bg-[#F9FBF9]/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white border border-gray-100 rounded-2xl flex items-center justify-center shadow-sm">
            <span className="text-gray-900 font-black text-lg">#{String(order.id || '').slice(-3) || '---'}</span>
          </div>
          <div>
            <h3 className="text-gray-900 font-black text-base leading-tight">{order.table_name || 'Bàn Mang Về'}</h3>
            <div className="flex items-center gap-1 text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">
              <Clock className="w-3 h-3" />
              <span>{formatDateShort(order.created_at)}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end">
           <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg uppercase tracking-tighter">
             {items.length} món chờ
           </span>
        </div>
      </div>

      {/* Items List */}
      <div className="flex-1 divide-y divide-gray-50">
        {items.map(item => {
          const action = STATUS_ACTIONS[item.status]
          return (
            <div key={item.id} className={`p-5 transition-colors ${item.status === 'PREPARING' ? 'bg-blue-50/20' : ''}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-6 h-6 bg-gray-900 text-white text-xs font-black rounded-lg flex items-center justify-center">
                      {item.quantity}
                    </span>
                    <span className="text-gray-900 font-black text-sm">{item.menu_item_name}</span>
                  </div>
                  {item.note && (
                    <div className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 px-3 py-1 rounded-xl text-[11px] font-bold mt-1 border border-amber-100/50">
                      <Bell className="w-3 h-3" />
                      <span>{item.note}</span>
                    </div>
                  )}
                </div>
                
                {action && (
                  <button
                    onClick={() => handleUpdate(item.id, action.next)}
                    disabled={updating[item.id]}
                    className={`h-10 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95 shadow-sm ${action.color}`}
                  >
                    {updating[item.id] ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <action.icon className="w-4 h-4" strokeWidth={3} />
                        <span>{action.label}</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const KDSPage = () => {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [station, setStation] = useState('GRILL')
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(false)

  const loadOrders = useCallback(async () => {
    try {
      const res = await kdsApi.getOrders(station)
      setOrders(res.data || [])
    } catch { toast.error('Lỗi tải dữ liệu') }
    finally { setLoading(false) }
  }, [station])

  useEffect(() => {
    loadOrders()
    const interval = setInterval(loadOrders, 10000)
    return () => clearInterval(interval)
  }, [loadOrders])

  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken')
    if (!accessToken) return
    const socket = getKitchenSocket(accessToken)
    socket.on('connect', () => {
      setConnected(true)
      socket.emit('join_station', station)
    })
    socket.on('disconnect', () => setConnected(false))
    socket.on('new_order', () => {
      toast.success('🔔 Có đơn hàng mới!', { duration: 5000, position: 'top-center' })
      loadOrders()
    })
    return () => {
      socket.off('connect')
      socket.off('disconnect')
      socket.off('new_order')
    }
  }, [station, loadOrders])

  const handleUpdateItem = (itemId, newStatus) => {
    setOrders(prev => prev.map(order => ({
      ...order,
      items: order.items?.map(item =>
        item.id === itemId ? { ...item, status: newStatus } : item
      )
    })))
  }

  const currentStation = STATIONS.find(s => s.value === station)

  return (
    <div className="min-h-screen bg-[#F9FBF9] text-gray-900 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-2xl border-b border-gray-100 px-8 py-4">
        <div className="max-w-[1800px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-900 rounded-[18px] flex items-center justify-center shadow-lg shadow-gray-200">
                <ChefHat className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight uppercase">Bếp Hệ Thống</h1>
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    {connected ? 'Trực tuyến' : 'Ngoại tuyến'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="h-8 w-px bg-gray-100 hidden md:block" />
            
            <div className="hidden md:flex gap-2">
              {STATIONS.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setStation(s.value)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all
                    ${station === s.value 
                      ? `${s.color} shadow-sm border ${s.border}` 
                      : 'text-gray-400 hover:bg-gray-50'}`}
                >
                  <s.icon className="w-4 h-4" />
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={loadOrders} className="w-12 h-12 rounded-2xl border border-gray-100 flex items-center justify-center text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 transition-all">
              <RefreshCw className="w-5 h-5" />
            </button>
            <button onClick={() => { logout(); navigate('/login'); }} className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-8 max-w-[1800px] mx-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-40">
             <div className="w-16 h-16 border-4 border-emerald-50 border-t-emerald-500 rounded-full animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-40 opacity-20">
            <Layers className="w-24 h-24 mb-6" />
            <h2 className="text-2xl font-black uppercase tracking-[0.2em]">Sẵn sàng nhận đơn</h2>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {orders.map(order => (
              <OrderCard key={order.id} order={order} onUpdateItem={handleUpdateItem} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default KDSPage
