import React, { useState, useEffect } from 'react'
import { adminApi } from '../../lib/api'
import { formatCurrency } from '../../lib/utils'
import { BarChart3, Download, Calendar, TrendingUp, UtensilsCrossed, Clock } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts'
import toast from 'react-hot-toast'

const COLORS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#ec4899', '#14b8a6', '#f59e0b']

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="glass-card p-3 text-sm">
        <p className="text-gray-400 mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} className="text-white font-semibold">{formatCurrency(p.value)}</p>
        ))}
      </div>
    )
  }
  return null
}

const AdminReportsPage = () => {
  const [revenue, setRevenue] = useState([])
  const [menuReport, setMenuReport] = useState([])
  const [kdsReport, setKdsReport] = useState([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [from, setFrom] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().split('T')[0]
  })
  const [to, setTo] = useState(() => new Date().toISOString().split('T')[0])
  const [groupBy, setGroupBy] = useState('day')

  useEffect(() => { loadReports() }, [from, to, groupBy])

  const loadReports = async () => {
    setLoading(true)
    try {
      const [revRes, menuRes, kdsRes] = await Promise.all([
        adminApi.getRevenueReport({ from, to, group_by: groupBy }),
        adminApi.getMenuReport(),
        adminApi.getKdsReport(),
      ])
      setRevenue(revRes.data || [])
      setMenuReport((menuRes.data || []).slice(0, 8))
      setKdsReport(kdsRes.data || [])
    } catch { toast.error('Không tải được báo cáo') }
    finally { setLoading(false) }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await adminApi.exportReport()
      const url = URL.createObjectURL(new Blob([res], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `bao-cao-${from}-${to}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Đã xuất báo cáo Excel')
    } catch { toast.error('Xuất báo cáo thất bại') }
    finally { setExporting(false) }
  }

  const totalRevenue = revenue.reduce((sum, r) => sum + (r.total || 0), 0)
  const totalOrders = revenue.reduce((sum, r) => sum + (r.order_count || 0), 0)

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="section-title mb-0 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-orange-400" />
          Báo cáo & Thống kê
        </h1>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="btn-success flex items-center gap-2"
        >
          <Download className={`w-4 h-4 ${exporting ? 'animate-bounce' : ''}`} />
          {exporting ? 'Đang xuất...' : 'Xuất Excel'}
        </button>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 mb-6 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="input-field py-2 w-40" />
          <span className="text-gray-500">—</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="input-field py-2 w-40" />
        </div>
        <div className="flex gap-2">
          {['day', 'week', 'month'].map(g => (
            <button
              key={g}
              onClick={() => setGroupBy(g)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                groupBy === g ? 'bg-orange-500 text-white' : 'bg-white/10 text-gray-400 hover:text-white'
              }`}
            >
              {g === 'day' ? 'Ngày' : g === 'week' ? 'Tuần' : 'Tháng'}
            </button>
          ))}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="glass-card p-5">
          <p className="text-gray-400 text-sm">Tổng doanh thu</p>
          <p className="text-3xl font-black text-orange-400 mt-1">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-gray-400 text-sm">Tổng đơn hàng</p>
          <p className="text-3xl font-black text-blue-400 mt-1">{totalOrders}</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-gray-400 text-sm">Giá trị TB/đơn</p>
          <p className="text-3xl font-black text-emerald-400 mt-1">{formatCurrency(totalOrders > 0 ? totalRevenue / totalOrders : 0)}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Revenue bar chart */}
          <div className="glass-card p-6 lg:col-span-2">
            <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-orange-400" />
              Doanh thu theo thời gian
            </h2>
            {revenue.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-gray-500">Không có dữ liệu</div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={revenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000000).toFixed(1)}M`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="total" fill="url(#revGrad)" radius={[4, 4, 0, 0]} name="Doanh thu" />
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.9} />
                      <stop offset="95%" stopColor="#ea580c" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Top items pie */}
          <div className="glass-card p-6">
            <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
              <UtensilsCrossed className="w-5 h-5 text-emerald-400" />
              Phân bố món bán
            </h2>
            {menuReport.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-gray-500">Không có dữ liệu</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={menuReport} dataKey="total_quantity" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name?.slice(0, 8)} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {menuReport.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Top items list */}
          <div className="glass-card p-6">
            <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-400" />
              Ranking món ăn
            </h2>
            <div className="space-y-3">
              {menuReport.map((item, idx) => {
                const maxQty = menuReport[0]?.total_quantity || 1
                const pct = ((item.total_quantity || 0) / maxQty) * 100
                return (
                  <div key={item.id || idx}>
                    <div className="flex justify-between text-sm mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: COLORS[idx % COLORS.length] }}>
                          {idx + 1}
                        </span>
                        <span className="text-gray-300 truncate">{item.name}</span>
                      </div>
                      <span className="text-gray-400 flex-shrink-0 ml-2">{item.total_quantity}</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: COLORS[idx % COLORS.length] }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminReportsPage
