import React, { useState, useEffect } from 'react'
import { adminApi } from '../../lib/api'
import { formatCurrency } from '../../lib/utils'
import { UtensilsCrossed, Plus, Edit2, Trash2, X, Check, RefreshCw, Flame, Wine, Salad, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'

const STATIONS = ['GRILL', 'BAR', 'COLD']
const STATION_ICONS = { GRILL: Flame, BAR: Wine, COLD: Salad }
const STATION_LABELS = { GRILL: 'Nướng', BAR: 'Bar', COLD: 'Lạnh' }

const defaultItem = { name: '', description: '', price: '', station: 'GRILL', category_id: '', daily_quota: '', daily_quota_default: '' }

const AdminMenuPage = () => {
  const [categories, setCategories] = useState([])
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('items')
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(defaultItem)
  const [saving, setSaving] = useState(false)
  const [stationFilter, setStationFilter] = useState('')
  const [resetting, setResetting] = useState(false)

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    try {
      const [catRes, itemRes] = await Promise.all([
        adminApi.getCategories(),
        adminApi.getMenuItems(),
      ])
      setCategories(catRes.data || [])
      setItems(itemRes.data || [])
    } catch { toast.error('Không tải được menu') }
    finally { setLoading(false) }
  }

  const openCreate = () => {
    setEditItem(null)
    setForm({ ...defaultItem, category_id: categories[0]?.id || '' })
    setModalOpen(true)
  }

  const openEdit = (item) => {
    setEditItem(item)
    setForm({
      name: item.name,
      description: item.description || '',
      price: item.price,
      station: item.station,
      category_id: item.category_id,
      daily_quota: item.daily_quota ?? '',
      daily_quota_default: item.daily_quota_default ?? '',
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const data = {
        ...form,
        price: parseFloat(form.price),
        daily_quota: form.daily_quota !== '' ? parseInt(form.daily_quota) : null,
        daily_quota_default: form.daily_quota_default !== '' ? parseInt(form.daily_quota_default) : null,
      }
      if (editItem) {
        await adminApi.updateMenuItem(editItem.id, data)
        toast.success('Đã cập nhật món')
      } else {
        await adminApi.createMenuItem(data)
        toast.success('Đã thêm món')
      }
      setModalOpen(false)
      loadAll()
    } catch (err) { toast.error(err?.message || 'Lỗi') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Xóa món này?')) return
    try {
      await adminApi.deleteMenuItem(id)
      setItems(prev => prev.filter(i => i.id !== id))
      toast.success('Đã xóa món')
    } catch { toast.error('Không thể xóa') }
  }

  const handleResetQuota = async () => {
    setResetting(true)
    try {
      await adminApi.resetQuota()
      toast.success('Đã reset quota!')
      loadAll()
    } catch { toast.error('Không reset được') }
    finally { setResetting(false) }
  }

  const filteredItems = stationFilter ? items.filter(i => i.station === stationFilter) : items

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="section-title mb-0 flex items-center gap-2">
          <UtensilsCrossed className="w-6 h-6 text-orange-400" />
          Quản lý Menu
        </h1>
        <div className="flex gap-2">
          <button onClick={handleResetQuota} disabled={resetting} className="btn-secondary flex items-center gap-2 text-sm px-4 py-2">
            <RefreshCw className={`w-4 h-4 ${resetting ? 'animate-spin' : ''}`} />
            Reset quota
          </button>
          <button onClick={openCreate} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Thêm món
          </button>
        </div>
      </div>

      {/* Station filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setStationFilter('')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${!stationFilter ? 'bg-orange-500 text-white' : 'bg-white/10 text-gray-400 hover:text-white hover:bg-white/20'}`}
        >
          Tất cả ({items.length})
        </button>
        {STATIONS.map(s => {
          const Icon = STATION_ICONS[s]
          const count = items.filter(i => i.station === s).length
          return (
            <button
              key={s}
              onClick={() => setStationFilter(s)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${stationFilter === s ? 'bg-orange-500 text-white' : 'bg-white/10 text-gray-400 hover:text-white hover:bg-white/20'}`}
            >
              <Icon className="w-4 h-4" />
              {STATION_LABELS[s]} ({count})
            </button>
          )
        })}
      </div>

      {/* Items table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center">
            <div className="w-8 h-8 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th className="px-6 py-4">Món ăn</th>
                <th className="px-6 py-4">Trạm</th>
                <th className="px-6 py-4">Giá</th>
                <th className="px-6 py-4">Quota</th>
                <th className="px-6 py-4">Trạng thái</th>
                <th className="px-6 py-4 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map(item => {
                const StationIcon = STATION_ICONS[item.station] || UtensilsCrossed
                return (
                  <tr key={item.id} className="group">
                    <td className="px-6">
                      <div>
                        <p className="text-white font-medium">{item.name}</p>
                        {item.description && <p className="text-gray-500 text-xs mt-0.5 truncate max-w-xs">{item.description}</p>}
                      </div>
                    </td>
                    <td className="px-6">
                      <span className="flex items-center gap-1.5 text-gray-300 text-sm">
                        <StationIcon className="w-4 h-4 text-orange-400" />
                        {STATION_LABELS[item.station]}
                      </span>
                    </td>
                    <td className="px-6">
                      <span className="text-orange-400 font-semibold">{formatCurrency(item.price)}</span>
                    </td>
                    <td className="px-6">
                      <span className="text-gray-300 text-sm">
                        {item.daily_quota ?? '∞'}/{item.daily_quota_default ?? '∞'}
                      </span>
                    </td>
                    <td className="px-6">
                      <span className={`badge ${item.is_available ? 'badge-ready' : 'badge-cancelled'}`}>
                        {item.is_available ? 'Khả dụng' : 'Không KD'}
                      </span>
                    </td>
                    <td className="px-6 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/40 text-blue-400">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-400">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setModalOpen(false)} />
          <div className="relative glass-card p-6 w-full max-w-lg animate-slide-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold text-lg">{editItem ? 'Sửa món' : 'Thêm món mới'}</h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Tên món *</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field" placeholder="Bít tết bò Mỹ" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Mô tả</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input-field h-20 resize-none" placeholder="Mô tả ngắn..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Giá (VND) *</label>
                  <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} className="input-field" placeholder="150000" step="1000" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Trạm bếp *</label>
                  <select value={form.station} onChange={e => setForm(f => ({ ...f, station: e.target.value }))} className="input-field">
                    {STATIONS.map(s => <option key={s} value={s}>{STATION_LABELS[s]}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Danh mục</label>
                <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))} className="input-field">
                  <option value="">— Không có —</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Quota hôm nay</label>
                  <input type="number" value={form.daily_quota} onChange={e => setForm(f => ({ ...f, daily_quota: e.target.value }))} className="input-field" placeholder="50" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Quota mặc định/ngày</label>
                  <input type="number" value={form.daily_quota_default} onChange={e => setForm(f => ({ ...f, daily_quota_default: e.target.value }))} className="input-field" placeholder="50" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setModalOpen(false)} className="btn-secondary flex-1">Hủy</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                {editItem ? 'Cập nhật' : 'Tạo mới'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminMenuPage
