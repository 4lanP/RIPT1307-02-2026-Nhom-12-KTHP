import React, { useState, useEffect } from 'react'
import { adminApi } from '../../lib/api'
import { getStatusLabel, getStatusClass } from '../../lib/utils'
import { Table2, Plus, Edit2, Trash2, X, Check, Users } from 'lucide-react'
import toast from 'react-hot-toast'

const defaultForm = { name: '', capacity: 4 }

const AdminTablesPage = () => {
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editTable, setEditTable] = useState(null)
  const [form, setForm] = useState(defaultForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadTables() }, [])

  const loadTables = async () => {
    try {
      const res = await adminApi.getTables()
      setTables(res.data || [])
    } catch { toast.error('Không tải được danh sách bàn') }
    finally { setLoading(false) }
  }

  const openCreate = () => {
    setEditTable(null)
    setForm(defaultForm)
    setModalOpen(true)
  }

  const openEdit = (table) => {
    setEditTable(table)
    setForm({ name: table.name, capacity: table.capacity || 4 })
    setModalOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editTable) {
        await adminApi.updateTable(editTable.id, form)
        toast.success('Đã cập nhật bàn')
      } else {
        await adminApi.createTable(form)
        toast.success('Đã thêm bàn')
      }
      setModalOpen(false)
      loadTables()
    } catch (err) { toast.error(err?.message || 'Lỗi') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Xóa bàn này?')) return
    try {
      await adminApi.deleteTable(id)
      setTables(prev => prev.filter(t => t.id !== id))
      toast.success('Đã xóa bàn')
    } catch { toast.error('Không thể xóa (có thể đang có session)') }
  }

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <h1 className="section-title mb-0 flex items-center gap-2">
          <Table2 className="w-6 h-6 text-orange-400" />
          Quản lý bàn
        </h1>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Thêm bàn
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {loading
          ? [...Array(8)].map((_, i) => (
              <div key={i} className="glass-card p-5 animate-pulse">
                <div className="w-12 h-12 rounded-xl bg-white/10 mb-4" />
                <div className="h-5 bg-white/10 rounded w-2/3 mb-2" />
                <div className="h-4 bg-white/10 rounded w-1/2" />
              </div>
            ))
          : tables.map(table => (
              <div key={table.id} className="glass-card p-4 group relative">
                <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(table)} className="p-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/40 text-blue-400">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(table.id)} className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-400">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${
                  table.status === 'OCCUPIED' ? 'bg-orange-500/20' : 'bg-emerald-500/20'
                }`}>
                  <Table2 className={`w-6 h-6 ${table.status === 'OCCUPIED' ? 'text-orange-400' : 'text-emerald-400'}`} />
                </div>
                <h3 className="text-white font-bold">{table.name}</h3>
                <div className="flex items-center gap-1 text-gray-500 text-xs mt-1">
                  <Users className="w-3 h-3" />
                  {table.capacity} chỗ
                </div>
                <span className={`badge ${getStatusClass(table.status)} mt-2`}>
                  {getStatusLabel(table.status)}
                </span>
              </div>
            ))
        }
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setModalOpen(false)} />
          <div className="relative glass-card p-6 w-full max-w-sm animate-slide-in">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold text-lg">{editTable ? 'Sửa bàn' : 'Thêm bàn'}</h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Tên bàn</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field" placeholder="Bàn 01" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Sức chứa</label>
                <input type="number" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: parseInt(e.target.value) }))} className="input-field" min="1" max="20" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setModalOpen(false)} className="btn-secondary flex-1">Hủy</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                {editTable ? 'Cập nhật' : 'Tạo mới'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminTablesPage
