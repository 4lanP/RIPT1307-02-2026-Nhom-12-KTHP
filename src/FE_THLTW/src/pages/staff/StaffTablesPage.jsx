import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { staffApi } from '../../lib/api'
import { getStaffSocket } from '../../lib/socket'
import { formatCurrency, getStatusLabel, getStatusClass } from '../../lib/utils'
import { Table2, Users, RefreshCw, Search } from 'lucide-react'
import toast from 'react-hot-toast'

const TableCard = ({ table }) => {
  const isOccupied = table.status === 'OCCUPIED'
  return (
    <Link
      to={`/tables/${table.id}`}
      className={`glass-card p-5 transition-all duration-300 hover:scale-105 hover:shadow-xl cursor-pointer ${
        isOccupied
          ? 'border-orange-500/40 hover:border-orange-500/60 hover:shadow-orange-500/10'
          : 'hover:border-emerald-500/30 hover:shadow-emerald-500/5'
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
          isOccupied ? 'bg-orange-500/20' : 'bg-emerald-500/20'
        }`}>
          <Table2 className={`w-6 h-6 ${isOccupied ? 'text-orange-400' : 'text-emerald-400'}`} />
        </div>
        <span className={`badge ${getStatusClass(table.status)}`}>
          {getStatusLabel(table.status)}
        </span>
      </div>
      <h3 className="text-white font-bold text-lg">{table.name}</h3>
      {table.capacity && (
        <div className="flex items-center gap-1 text-gray-500 text-sm mt-1">
          <Users className="w-3.5 h-3.5" />
          <span>{table.capacity} chỗ</span>
        </div>
      )}
      {isOccupied && table.subtotal != null && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <p className="text-gray-400 text-xs">Tổng tiền</p>
          <p className="text-orange-400 font-bold">{formatCurrency(table.subtotal)}</p>
        </div>
      )}
    </Link>
  )
}

const StaffTablesPage = () => {
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('ALL')

  useEffect(() => {
    loadTables()
    const accessToken = localStorage.getItem('accessToken')
    if (!accessToken) return
    const socket = getStaffSocket(accessToken)
    socket.on('table:status_update', () => loadTables())
    socket.on('new_request', () => toast('🔔 Yêu cầu mới từ khách!', { icon: '📢' }))
    return () => {
      socket.off('table:status_update')
      socket.off('new_request')
    }
  }, [])

  const loadTables = async () => {
    try {
      const res = await staffApi.getTables()
      setTables(res.data || [])
    } catch { toast.error('Không tải được danh sách bàn') }
    finally { setLoading(false) }
  }

  const filtered = tables
    .filter(t => filter === 'ALL' || t.status === filter)
    .filter(t => t.name?.toLowerCase().includes(search.toLowerCase()))

  const occupiedCount = tables.filter(t => t.status === 'OCCUPIED').length
  const availableCount = tables.filter(t => t.status === 'AVAILABLE').length

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="section-title mb-0">Quản lý bàn</h1>
          <p className="text-gray-400 text-sm mt-1">
            <span className="text-orange-400 font-semibold">{occupiedCount}</span> có khách ·{' '}
            <span className="text-emerald-400 font-semibold">{availableCount}</span> trống
          </p>
        </div>
        <button
          onClick={loadTables}
          className="btn-secondary btn-sm flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Làm mới
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Tìm bàn..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        <div className="flex gap-2">
          {['ALL', 'OCCUPIED', 'AVAILABLE'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                filter === f
                  ? 'bg-orange-500 text-white'
                  : 'bg-white/10 text-gray-400 hover:text-white hover:bg-white/20'
              }`}
            >
              {f === 'ALL' ? 'Tất cả' : f === 'OCCUPIED' ? 'Có khách' : 'Trống'}
            </button>
          ))}
        </div>
      </div>

      {/* Tables grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="glass-card p-5 animate-pulse">
              <div className="w-12 h-12 rounded-xl bg-white/10 mb-4" />
              <div className="h-5 bg-white/10 rounded w-2/3 mb-2" />
              <div className="h-4 bg-white/10 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <Table2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Không tìm thấy bàn</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map(table => (
            <TableCard key={table.id} table={table} />
          ))}
        </div>
      )}
    </div>
  )
}

export default StaffTablesPage
