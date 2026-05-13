import React, { useState, useEffect } from 'react'
import { adminApi, staffApi } from '../../lib/api'
import { formatCurrency, formatDateShort } from '../../lib/utils'
import {
  LayoutGrid, TrendingUp, Users, Table2, UtensilsCrossed,
  DollarSign, ShoppingBag, RefreshCw, BarChart3
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts'
import toast from 'react-hot-toast'

const StatCard = ({ icon: Icon, label, value, color, change }) => (
  <div className="glass-card p-5">
    <div className="flex items-start justify-between mb-4">
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      {change && (
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
          change >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
        }`}>
          {change >= 0 ? '+' : ''}{change}%
        </span>
      )}
    </div>
    <p className="text-gray-400 text-sm">{label}</p>
    <p className="text-white font-bold text-2xl mt-1">{value}</p>
  </div>
)

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card p-3">
        <p className="text-gray-400 text-xs mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} className="text-white font-semibold text-sm">{formatCurrency(p.value)}</p>
        ))}
      </div>
    )
  }
  return null
}

const AdminDashboardPage = () => {
  const [revenue, setRevenue] = useState([])
  const [menuReport, setMenuReport] = useState([])
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('day')

  useEffect(() => {
    loadData()
  }, [period])

  const getDateRange = () => {
    const now = new Date()
    const to = now.toISOString().split('T')[0]
    const from = new Date(now)
    if (period === 'day') from.setDate(from.getDate() - 7)
    else if (period === 'week') from.setDate(from.getDate() - 28)
    else from.setMonth(from.getMonth() - 3)
    return { from: from.toISOString().split('T')[0], to }
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const { from, to } = getDateRange()
      const [revRes, menuRes, tableRes] = await Promise.all([
        adminApi.getRevenueReport({ from, to, group_by: period }),
        adminApi.getMenuReport(),
        staffApi.getTables(),
      ])
      setRevenue(revRes.data || [])
      setMenuReport((menuRes.data || []).slice(0, 8))
      setTables(tableRes.data || [])
    } catch { toast.error('Không tải được dữ liệu') }
    finally { setLoading(false) }
  }

  const totalRevenue = revenue.reduce((sum, r) => sum + (r.total || 0), 0)
  const occupiedTables = tables.filter(t => t.status === 'OCCUPIED').length

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <h1 className="section-title mb-0 flex items-center gap-2">
          <LayoutGrid className="w-6 h-6 text-orange-400" />
          Dashboard
        </h1>
        <button onClick={loadData} className="btn-secondary btn-sm flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          Làm mới
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={DollarSign} label="Doanh thu kỳ" value={formatCurrency(totalRevenue)} color="from-orange-500 to-orange-700" />
        <StatCard icon={Table2} label="Bàn đang có khách" value={`${occupiedTables}/${tables.length}`} color="from-blue-500 to-blue-700" />
        <StatCard icon={ShoppingBag} label="Món bán chạy nhất" value={menuReport[0]?.name?.slice(0, 14) || '—'} color="from-emerald-500 to-emerald-700" />
        <StatCard icon={BarChart3} label="Báo cáo điểm" value={menuReport.length + ' món'} color="from-purple-500 to-purple-700" />
      </div>

      {/* Period selector */}
      <div className="flex gap-2 mb-6">
        {['day', 'week', 'month'].map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              period === p ? 'bg-orange-500 text-white' : 'bg-white/10 text-gray-400 hover:text-white hover:bg-white/20'
            }`}
          >
            {p === 'day' ? 'Theo ngày' : p === 'week' ? 'Theo tuần' : 'Theo tháng'}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Revenue chart */}
        <div className="glass-card p-6">
          <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-orange-400" />
            Doanh thu
          </h2>
          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
            </div>
          ) : revenue.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-500">Không có dữ liệu</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={revenue} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 11 }} />
                <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000000).toFixed(1)}M`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="total" fill="url(#orange)" radius={[4, 4, 0, 0]} />
                <defs>
                  <linearGradient id="orange" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.9} />
                    <stop offset="95%" stopColor="#ea580c" stopOpacity={0.7} />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top menu items */}
        <div className="glass-card p-6">
          <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5 text-emerald-400" />
            Món bán chạy
          </h2>
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-8 bg-white/10 rounded animate-pulse" />
              ))}
            </div>
          ) : menuReport.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-500">Không có dữ liệu</div>
          ) : (
            <div className="space-y-3">
              {menuReport.map((item, idx) => {
                const maxQty = menuReport[0]?.total_quantity || 1
                const pct = ((item.total_quantity || 0) / maxQty) * 100
                return (
                  <div key={item.id || idx}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-300 font-medium truncate flex-1 mr-2">
                        <span className="text-gray-500 mr-2">#{idx + 1}</span>
                        {item.name}
                      </span>
                      <span className="text-gray-400 flex-shrink-0">{item.total_quantity} món</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Table status */}
        <div className="glass-card p-6">
          <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
            <Table2 className="w-5 h-5 text-blue-400" />
            Trạng thái bàn
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-card p-4 text-center border-orange-500/30">
              <p className="text-4xl font-black text-orange-400">{occupiedTables}</p>
              <p className="text-gray-400 text-sm mt-1">Có khách</p>
            </div>
            <div className="glass-card p-4 text-center border-emerald-500/30">
              <p className="text-4xl font-black text-emerald-400">{tables.length - occupiedTables}</p>
              <p className="text-gray-400 text-sm mt-1">Trống</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="h-3 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-orange-600 rounded-full transition-all"
                style={{ width: `${tables.length > 0 ? (occupiedTables / tables.length) * 100 : 0}%` }}
              />
            </div>
            <p className="text-gray-500 text-xs mt-1 text-right">
              {tables.length > 0 ? Math.round((occupiedTables / tables.length) * 100) : 0}% công suất
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboardPage
