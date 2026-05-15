import React, { useState, useEffect } from 'react'
import { adminApi, staffApi } from '../../lib/api'
import { formatCurrency } from '../../lib/utils'
import {
  LayoutGrid, TrendingUp, Users, Table2, UtensilsCrossed,
  DollarSign, ShoppingBag, RefreshCw, BarChart3, ChevronUp, ChevronDown, Sparkles, ArrowUpRight
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from 'recharts'
import toast from 'react-hot-toast'

const StatCard = ({ icon: Icon, label, value, color, bgGradient, trend }) => (
  <div className={`relative p-7 rounded-[28px] border shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group overflow-hidden ${bgGradient || 'bg-white border-gray-100'}`}>
    {/* Decorative circle */}
    <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/[0.06] group-hover:scale-125 transition-transform duration-500" />
    <div className="absolute -bottom-4 -right-4 w-16 h-16 rounded-full bg-white/[0.04] group-hover:scale-110 transition-transform duration-500" />
    
    <div className="relative flex items-start justify-between mb-5">
      <div className={`w-12 h-12 rounded-2xl ${color} flex items-center justify-center shadow-lg`}>
        <Icon className="w-6 h-6" />
      </div>
      {trend && (
        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold ${trend > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
          {trend > 0 ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {Math.abs(trend)}%
        </div>
      )}
    </div>
    <p className="text-gray-400 font-semibold text-[11px] uppercase tracking-widest mb-1">{label}</p>
    <p className="text-2xl font-bold tracking-tight text-gray-900">{value}</p>
  </div>
)

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900 text-white p-4 rounded-xl shadow-2xl border border-white/10 animate-scale-in">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">{label}</p>
        <p className="text-lg font-bold">{formatCurrency(payload[0].value)}</p>
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
      setMenuReport((menuRes.data || []).slice(0, 5))
      setTables(tableRes.data || [])
    } catch { toast.error('Lỗi tải dữ liệu') }
    finally { setLoading(false) }
  }

  const totalRevenue = revenue.reduce((sum, r) => sum + (r.total || 0), 0)
  const occupiedTables = tables.filter(t => t.status === 'OCCUPIED').length

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-emerald-500" />
            <span className="text-emerald-600 text-xs font-bold uppercase tracking-widest">Analytics</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
          <p className="text-gray-400 font-medium mt-1 text-sm">Chào buổi sáng! Đây là dữ liệu kinh doanh của 3POS.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white p-1.5 rounded-xl border border-gray-100 flex shadow-sm">
            {['day', 'week', 'month'].map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-5 py-2 rounded-lg text-xs font-semibold transition-all
                  ${period === p ? 'bg-gray-900 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
              >
                {p === 'day' ? '7 Ngày' : p === 'week' ? '4 Tuần' : '3 Tháng'}
              </button>
            ))}
          </div>
          <button onClick={loadData} className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 hover:border-emerald-200 transition-all shadow-sm">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard 
          icon={DollarSign} 
          label="Tổng Doanh Thu" 
          value={formatCurrency(totalRevenue)} 
          color="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white" 
          trend={12.5}
        />
        <StatCard 
          icon={Table2} 
          label="Bàn Đang Phục Vụ" 
          value={`${occupiedTables}/${tables.length}`} 
          color="bg-gradient-to-br from-blue-500 to-blue-600 text-white" 
          trend={-2.4}
        />
        <StatCard 
          icon={ShoppingBag} 
          label="Bán Chạy Nhất" 
          value={menuReport[0]?.name?.split(' ')[0] || '—'} 
          color="bg-gradient-to-br from-orange-500 to-amber-500 text-white" 
        />
        <StatCard 
          icon={Users} 
          label="Tổng Sản Phẩm" 
          value={menuReport.length + '+'} 
          color="bg-gradient-to-br from-purple-500 to-violet-500 text-white" 
        />
      </div>

      {/* Main Charts Section */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white p-7 rounded-[28px] border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">Doanh Thu Theo Thời Gian</h2>
              <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mt-1">Xu hướng tăng trưởng</p>
            </div>
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          
          <div className="h-[320px] w-full">
            {loading ? (
              <div className="h-full flex items-center justify-center"><div className="w-10 h-10 border-4 border-emerald-50 border-t-emerald-500 rounded-full animate-spin" /></div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenue}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 600}} 
                    dy={15}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 600}} 
                    tickFormatter={v => `${(v / 1000000).toFixed(1)}M`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="total" 
                    stroke="#10b981" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#colorTotal)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white p-7 rounded-[28px] border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-7">
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Top Bán Chạy</h2>
            <BarChart3 className="w-5 h-5 text-gray-300" />
          </div>
          
          <div className="space-y-5">
            {loading ? (
               <div className="space-y-4">
                 {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-50 rounded-xl animate-pulse" />)}
               </div>
            ) : (
              menuReport.map((item, i) => (
                <div key={i} className="group cursor-pointer">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-gray-50 text-gray-400 font-bold text-xs flex items-center justify-center border border-gray-100 group-hover:bg-emerald-50 group-hover:text-emerald-600 group-hover:border-emerald-100 transition-all">
                        #{i + 1}
                      </div>
                      <span className="text-gray-900 font-semibold text-sm truncate max-w-[130px]">{item.name}</span>
                    </div>
                    <span className="text-xs font-bold text-gray-400">{item.total_quantity} Lượt</span>
                  </div>
                  <div className="h-1.5 bg-gray-50 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-1000 group-hover:from-emerald-500 group-hover:to-emerald-600"
                      style={{ width: `${(item.total_quantity / (menuReport[0]?.total_quantity || 1)) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
          
          <button className="w-full mt-7 py-3.5 bg-gray-50 text-gray-500 font-semibold text-xs uppercase tracking-widest rounded-xl border border-gray-100 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-all flex items-center justify-center gap-2 group">
            Xem tất cả báo cáo
            <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboardPage
