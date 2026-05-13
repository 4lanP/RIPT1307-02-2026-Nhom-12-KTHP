import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { kdsApi } from '../../lib/api'
import { useAuth } from '../../contexts/AuthContext'
import { getKitchenSocket } from '../../lib/socket'
import { formatDateShort, getStatusLabel, getStatusClass } from '../../lib/utils'
import { ChefHat, RefreshCw, LogOut, Flame, Wine, Salad, CheckCircle, Clock, PlayCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const STATIONS = [
  { value: 'GRILL', label: 'Nướng', icon: Flame, color: 'from-orange-500 to-red-500', glow: 'shadow-orange-500/30' },
  { value: 'BAR', label: 'Bar', icon: Wine, color: 'from-blue-500 to-purple-500', glow: 'shadow-blue-500/30' },
  { value: 'COLD', label: 'Lạnh', icon: Salad, color: 'from-emerald-500 to-teal-500', glow: 'shadow-emerald-500/30' },
]

const STATUS_ACTIONS = {
  PENDING: { next: 'PREPARING', label: 'Bắt đầu', icon: PlayCircle, color: 'btn-primary' },
  PREPARING: { next: 'READY', label: 'Sẵn sàng', icon: CheckCircle, color: 'btn-success' },
  READY: { next: 'SERVED', label: 'Đã phục vụ', icon: CheckCircle, color: 'btn-secondary' },
}

const OrderCard = ({ order, onUpdateItem }) => {
  const [updating, setUpdating] = useState({})

  const handleUpdate = async (itemId, newStatus) => {
    setUpdating(p => ({ ...p, [itemId]: true }))
    try {
      await kdsApi.updateItemStatus(itemId, newStatus)
      onUpdateItem(itemId, newStatus)
      toast.success(`Cập nhật: ${getStatusLabel(newStatus)}`)
    } catch { toast.error('Cập nhật thất bại') }
    finally { setUpdating(p => ({ ...p, [itemId]: false })) }
  }

  const pendingCount = order.items?.filter(i => i.status === 'PENDING').length || 0
  const preparingCount = order.items?.filter(i => i.status === 'PREPARING').length || 0
  const readyCount = order.items?.filter(i => i.status === 'READY').length || 0

  return (
    <div className="glass-card overflow-hidden animate-slide-up">
      {/* Order header */}
      <div className="px-4 py-3 bg-white/5 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center">
            <span className="text-orange-400 font-bold text-sm">#{order.id}</span>
          </div>
          <div>
            <p className="text-white font-semibold text-sm">{order.table_name || `Bàn ${order.table_id}`}</p>
            <p className="text-gray-500 text-xs">{formatDateShort(order.created_at)}</p>
          </div>
        </div>
        <div className="flex gap-1.5">
          {pendingCount > 0 && <span className="badge-pending text-xs px-2 py-0.5 rounded-full badge">{pendingCount} chờ</span>}
          {preparingCount > 0 && <span className="badge-preparing text-xs px-2 py-0.5 rounded-full badge">{preparingCount} nấu</span>}
          {readyCount > 0 && <span className="badge-ready text-xs px-2 py-0.5 rounded-full badge">{readyCount} xong</span>}
        </div>
      </div>

      {/* Items */}
      <div className="divide-y divide-white/5">
        {order.items?.filter(i => i.status !== 'SERVED' && i.status !== 'CANCELLED').map(item => {
          const action = STATUS_ACTIONS[item.status]
          return (
            <div key={item.id} className={`p-4 flex items-center justify-between gap-3 transition-colors ${
              item.status === 'PENDING' ? 'kds-card-pending' :
              item.status === 'PREPARING' ? 'kds-card-preparing' :
              item.status === 'READY' ? 'kds-card-ready' : ''
            }`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`badge ${getStatusClass(item.status)}`}>
                    {getStatusLabel(item.status)}
                  </span>
                  <span className="text-white font-semibold text-sm truncate">{item.menu_item_name}</span>
                  <span className="text-gray-400 text-sm">x{item.quantity}</span>
                </div>
                {item.note && (
                  <p className="text-yellow-400/80 text-xs mt-1 italic">📝 {item.note}</p>
                )}
              </div>
              {action && (
                <button
                  onClick={() => handleUpdate(item.id, action.next)}
                  disabled={updating[item.id]}
                  className={`${action.color} btn-sm flex items-center gap-1.5 flex-shrink-0`}
                >
                  {updating[item.id] ? (
                    <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                  ) : (
                    <action.icon className="w-4 h-4" />
                  )}
                  {action.label}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const KDSPage = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [station, setStation] = useState('GRILL')
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [connected, setConnected] = useState(false)

  const loadOrders = useCallback(async () => {
    try {
      const res = await kdsApi.getOrders(station)
      setOrders(res.data || [])
      setLastUpdate(new Date())
    } catch { toast.error('Không tải được đơn') }
    finally { setLoading(false) }
  }, [station])

  useEffect(() => {
    loadOrders()
    const interval = setInterval(loadOrders, 30000)
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
    socket.on('new_order', (data) => {
      toast('🔔 Đơn mới!', { icon: '🍽️', duration: 4000 })
      loadOrders()
    })
    socket.on('order_item_updated', loadOrders)
    return () => {
      socket.off('connect')
      socket.off('disconnect')
      socket.off('new_order')
      socket.off('order_item_updated')
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

  const activeOrders = orders.filter(o =>
    o.items?.some(i => !['SERVED', 'CANCELLED'].includes(i.status))
  )

  const stationInfo = STATIONS.find(s => s.value === station)
  const StationIcon = stationInfo?.icon || ChefHat

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* KDS Header */}
      <header className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur-xl border-b border-white/10">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stationInfo?.color} flex items-center justify-center shadow-lg ${stationInfo?.glow}`}>
              <StationIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-xl">KDS — {stationInfo?.label}</h1>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-red-400'}`} />
                <span className="text-gray-400 text-xs">{connected ? 'Kết nối' : 'Mất kết nối'}</span>
                {lastUpdate && (
                  <span className="text-gray-600 text-xs">· {lastUpdate.toLocaleTimeString('vi-VN')}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-white font-bold text-2xl px-4 py-2 rounded-xl bg-white/10">
              {activeOrders.length}
            </span>
            <button
              onClick={loadOrders}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white transition-colors"
              title="Làm mới"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl bg-white/10 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Station tabs */}
        <div className="px-6 pb-4 flex gap-3">
          {STATIONS.map(({ value, label, icon: Icon, color }) => (
            <button
              key={value}
              onClick={() => setStation(value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all
                ${station === value
                  ? `bg-gradient-to-r ${color} text-white shadow-lg`
                  : 'bg-white/10 text-gray-400 hover:text-white hover:bg-white/20'
                }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-gray-400">Đang tải...</p>
            </div>
          </div>
        ) : activeOrders.length === 0 ? (
          <div className="text-center py-20">
            <ChefHat className="w-16 h-16 mx-auto mb-4 text-gray-700" />
            <h3 className="text-gray-400 font-semibold text-lg">Không có đơn hàng</h3>
            <p className="text-gray-600 text-sm mt-1">Trạm {stationInfo?.label} đang rảnh</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {activeOrders.map(order => (
              <OrderCard key={order.id} order={order} onUpdateItem={handleUpdateItem} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default KDSPage
