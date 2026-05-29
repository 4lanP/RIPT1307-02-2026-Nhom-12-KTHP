import React, { useState, useEffect } from 'react'
import { adminApi } from '../../lib/api'
import { formatCurrency } from '../../lib/utils'
import ModalPortal from '../../components/ModalPortal'
import { buildImagePreviewSrc, getImageInputValidationMessage, resolveMenuImageUrl } from './adminMenuImage'
import { UtensilsCrossed, Plus, Edit2, Trash2, X, RefreshCw, Flame, Wine, Salad, Search, Image as ImageIcon, Upload } from 'lucide-react'
import toast from 'react-hot-toast'

const STATIONS = ['GRILL', 'BAR', 'COLD']
const STATION_ICONS = { GRILL: Flame, BAR: Wine, COLD: Salad }
const STATION_LABELS = { GRILL: 'Bếp Nướng', BAR: 'Pha Chế', COLD: 'Bếp Salad' }
const STATION_COLORS = { 
  GRILL: 'bg-orange-50 text-orange-600 border-orange-100', 
  BAR: 'bg-blue-50 text-blue-600 border-blue-100', 
  COLD: 'bg-emerald-50 text-emerald-600 border-emerald-100' 
}

const defaultItem = { name: '', description: '', price: '', station: 'GRILL', category_id: '', daily_quota: '', daily_quota_default: '', image_url: '' }

const parseNumberInput = (value) => Number(String(value).replace(',', '.'))

const AdminMenuPage = () => {
  const [categories, setCategories] = useState([])
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(defaultItem)
  const [saving, setSaving] = useState(false)
  const [stationFilter, setStationFilter] = useState('')
  const [resetting, setResetting] = useState(false)
  const [search, setSearch] = useState('')
  const [imageError, setImageError] = useState('')

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    try {
      const [catRes, itemRes] = await Promise.all([
        adminApi.getCategories(),
        adminApi.getMenuItems(),
      ])
      setCategories(catRes.data || [])
      setItems(itemRes.data || [])
    } catch { toast.error('Lỗi tải dữ liệu') }
    finally { setLoading(false) }
  }

  const openCreate = () => {
    setEditItem(null)
    setForm({ ...defaultItem, category_id: categories[0]?.id || '' })
    setImageError('')
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
      image_url: item.image_url || '',
    })
    setImageError('')
    setModalOpen(true)
  }

  const handleSave = async () => {
    const price = parseNumberInput(form.price)
    const categoryId = Number(form.category_id)
    if (form.name.trim().length < 2) {
      toast.error('Tên món phải có ít nhất 2 ký tự')
      return
    }
    if (!Number.isFinite(price) || price <= 0) {
      toast.error('Giá bán phải lớn hơn 0')
      return
    }
    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      toast.error('Vui lòng chọn danh mục món')
      return
    }
    const dailyQuota = form.daily_quota !== '' ? parseNumberInput(form.daily_quota) : undefined
    const dailyQuotaDefault = form.daily_quota_default !== '' ? parseNumberInput(form.daily_quota_default) : undefined
    if ((dailyQuota !== undefined && (!Number.isInteger(dailyQuota) || dailyQuota < 0)) ||
        (dailyQuotaDefault !== undefined && (!Number.isInteger(dailyQuotaDefault) || dailyQuotaDefault < 0))) {
      toast.error('Quota phải là số nguyên không âm')
      return
    }
    const imageValidationMessage = getImageInputValidationMessage(form.image_url)
    if (imageValidationMessage) {
      setImageError(imageValidationMessage)
      toast.error(imageValidationMessage)
      return
    }

    setSaving(true)
    try {
      const imageUrl = await resolveMenuImageUrl(form.image_url, adminApi.uploadBase64MenuImage)
      const data = {
        name: form.name.trim(),
        description: form.description.trim(),
        station: form.station,
        category_id: categoryId,
        price,
        daily_quota: dailyQuota,
        daily_quota_default: dailyQuotaDefault,
        image_url: imageUrl,
      }
      if (editItem) {
        await adminApi.updateMenuItem(editItem.id, data)
        toast.success('Đã cập nhật thực đơn')
      } else {
        await adminApi.createMenuItem(data)
        toast.success('Đã thêm món mới')
      }
      setModalOpen(false)
      setImageError('')
      loadAll()
    } catch (error) {
      const message = error?.errors?.[0]?.message || error?.message || 'Lỗi lưu dữ liệu'
      setImageError(message)
      toast.error(message)
    }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Xác nhận xóa món này?')) return
    try {
      await adminApi.deleteMenuItem(id)
      setItems(prev => prev.filter(i => i.id !== id))
      toast.success('Đã xóa')
    } catch { toast.error('Lỗi xóa') }
  }

  const handleResetQuota = async () => {
    setResetting(true)
    try {
      await adminApi.resetQuota()
      toast.success('Đã làm mới số lượng trong ngày')
      loadAll()
    } catch { toast.error('Lỗi reset') }
    finally { setResetting(false) }
  }

  const filteredItems = items.filter(i => {
    const matchStation = !stationFilter || i.station === stationFilter
    const matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase())
    return matchStation && matchSearch
  })
  const imagePreviewSrc = buildImagePreviewSrc(form.image_url)

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Quản Lý Thực Đơn</h1>
          <p className="text-gray-400 font-medium mt-1 text-base">Tổng số {items.length} món ăn đang kinh doanh tại 3POS.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleResetQuota} 
            disabled={resetting} 
            className="flex items-center gap-2 bg-white border border-gray-100 px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest text-gray-400 hover:text-emerald-600 hover:border-emerald-100 hover:bg-emerald-50 transition-all shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${resetting ? 'animate-spin' : ''}`} />
            Reset Quota
          </button>
          <button
            onClick={openCreate}
            disabled={loading}
            className="flex items-center gap-2 bg-gray-900 text-white px-8 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" strokeWidth={3} />
            Thêm món mới
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex flex-col lg:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
           <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
           <input 
             type="text" 
             value={search}
             onChange={e => setSearch(e.target.value)}
             placeholder="Tìm kiếm món ăn..." 
             className="w-full bg-[#F9FBF9] border-none rounded-2xl pl-14 pr-6 py-4 text-sm font-bold text-gray-900 focus:ring-4 focus:ring-emerald-500/5 transition-all"
           />
        </div>
        
        <div className="flex gap-2 w-full lg:w-auto overflow-x-auto pb-2 lg:pb-0">
          <button
            onClick={() => setStationFilter('')}
            className={`px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap
              ${!stationFilter ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
          >
            Tất cả
          </button>
          {STATIONS.map(s => {
            const Icon = STATION_ICONS[s]
            return (
              <button
                key={s}
                onClick={() => setStationFilter(s)}
                className={`flex items-center gap-2 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap
                  ${stationFilter === s ? `${STATION_COLORS[s]} border shadow-sm` : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
              >
                <Icon className="w-4 h-4" />
                {STATION_LABELS[s]}
              </button>
            )
          })}
        </div>
      </div>

      {/* Menu Table */}
      <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left min-w-[850px]">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="pl-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Món ăn</th>
                <th className="px-6 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Phân loại</th>
                <th className="px-6 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Giá bán</th>
                <th className="px-6 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center whitespace-nowrap">Quota</th>
                <th className="px-6 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Trạng thái</th>
                <th className="pr-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right whitespace-nowrap">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                 <tr><td colSpan={6} className="py-20 text-center"><div className="w-10 h-10 border-4 border-emerald-50 border-t-emerald-500 rounded-full animate-spin mx-auto" /></td></tr>
              ) : filteredItems.length === 0 ? (
                 <tr><td colSpan={6} className="py-20 text-center text-gray-400 font-bold">Không tìm thấy món ăn nào</td></tr>
              ) : filteredItems.map(item => {
                const StationIcon = STATION_ICONS[item.station] || UtensilsCrossed
                const colorClass = STATION_COLORS[item.station] || 'bg-gray-50 text-gray-500'
                return (
                  <tr key={item.id} className="group hover:bg-[#F9FBF9] transition-colors">
                    <td className="pl-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-emerald-500 border border-gray-100 group-hover:scale-105 transition-transform overflow-hidden relative">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <UtensilsCrossed className="w-6 h-6" />
                          )}
                        </div>
                        <div>
                          <p className="text-gray-900 font-black text-base leading-tight">{item.name}</p>
                          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-1">ID: #{String(item.id || '----')}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 whitespace-nowrap">
                      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border ${colorClass} text-[10px] font-black uppercase tracking-widest shadow-sm whitespace-nowrap`}>
                        <StationIcon className="w-3 h-3" />
                        {STATION_LABELS[item.station]}
                      </div>
                    </td>
                    <td className="px-6 whitespace-nowrap">
                      <span className="text-gray-900 font-black text-base whitespace-nowrap">{formatCurrency(item.price)}</span>
                    </td>
                    <td className="px-6 text-center whitespace-nowrap">
                       <div className="flex flex-col items-center">
                          <span className="text-gray-900 font-black text-sm">{item.daily_quota ?? '∞'}</span>
                          <div className="w-12 h-1 bg-gray-100 rounded-full mt-1 overflow-hidden">
                             <div className="h-full bg-emerald-500" style={{ width: item.daily_quota_default ? `${Math.max(0, Math.min(100, (item.daily_quota / item.daily_quota_default) * 100))}%` : '100%' }} />
                          </div>
                          <span className="text-[8px] font-black text-gray-400 uppercase mt-1">/ {item.daily_quota_default ?? '∞'}</span>
                       </div>
                    </td>
                    <td className="px-6 whitespace-nowrap">
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter whitespace-nowrap ${item.is_available ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                        {item.is_available ? 'Sẵn sàng' : 'Tạm hết'}
                      </span>
                    </td>
                    <td className="pr-8 py-6 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-3 md:opacity-0 md:group-hover:opacity-100 opacity-100 transition-all">
                        <button onClick={() => openEdit(item)} className="w-10 h-10 bg-white border border-gray-100 rounded-xl flex items-center justify-center text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 hover:border-emerald-100 transition-all shadow-sm">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(item.id)} className="w-10 h-10 bg-white border border-gray-100 rounded-xl flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 hover:border-red-100 transition-all shadow-sm">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modern Modal */}
      {modalOpen && (
        <ModalPortal>
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md animate-fade-in" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white rounded-[32px] sm:rounded-[40px] shadow-2xl w-full max-w-2xl max-h-[calc(100vh-3rem)] animate-[bounce-in_0.4s_ease-out] overflow-hidden flex flex-col">
            <div className="px-10 py-8 border-b border-gray-50 flex items-center justify-between">
               <div>
                  <h3 className="text-2xl font-black text-gray-900 tracking-tight">{editItem ? 'Chỉnh Sửa Món Ăn' : 'Thêm Món Mới'}</h3>
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Thông tin chi tiết thực đơn</p>
               </div>
               <button onClick={() => setModalOpen(false)} className="w-10 h-10 bg-gray-50 text-gray-400 hover:text-gray-900 rounded-xl flex items-center justify-center transition-all">
                  <X className="w-5 h-5" strokeWidth={3} />
               </button>
            </div>
            
            <div className="p-6 sm:p-10 space-y-8 overflow-y-auto custom-scrollbar flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Tên món ăn</label>
                    <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full bg-[#F9FBF9] border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold text-gray-900 focus:ring-4 focus:ring-emerald-500/5 transition-all" placeholder="Ví dụ: Bít tết bò Mỹ" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Giá bán (VND)</label>
                    <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} className="w-full bg-[#F9FBF9] border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold text-gray-900 focus:ring-4 focus:ring-emerald-500/5 transition-all" placeholder="150000" />
                 </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Mô tả chi tiết</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full bg-[#F9FBF9] border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold text-gray-900 focus:ring-4 focus:ring-emerald-500/5 transition-all h-24 resize-none" placeholder="Nguyên liệu, cách chế biến..." />
              </div>

              {/* Image Upload Area */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Hình ảnh món ăn</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Upload/Preview container */}
                  <div className="h-32 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center relative overflow-hidden group hover:border-emerald-500 transition-colors bg-[#F9FBF9]">
                    {imagePreviewSrc ? (
                      <>
                        <img src={imagePreviewSrc} alt="Preview" className="w-full h-full object-cover" />
                        <button 
                          type="button"
                          onClick={() => {
                            setForm(f => ({ ...f, image_url: '' }))
                            setImageError('')
                          }}
                          className="absolute top-2 right-2 w-6 h-6 bg-red-500 hover:bg-red-650 text-white rounded-full flex items-center justify-center shadow-md active:scale-90 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <X className="w-3.5 h-3.5" strokeWidth={3} />
                        </button>
                      </>
                    ) : form.image_url.trim() ? (
                      <div className="flex flex-col items-center justify-center p-4 text-center">
                        <ImageIcon className="w-7 h-7 text-red-400 mb-2" />
                        <span className="text-[10px] font-black text-red-500 uppercase tracking-wider">Ảnh chưa hợp lệ</span>
                      </div>
                    ) : (
                      <label className="cursor-pointer flex flex-col items-center justify-center p-4 w-full h-full text-center">
                        <Upload className="w-6 h-6 text-gray-400 group-hover:text-emerald-500 mb-2 transition-colors" />
                        <span className="text-[10px] font-black text-gray-400 group-hover:text-emerald-600 uppercase tracking-wider transition-colors">Tải ảnh lên</span>
                        <input 
                          type="file" 
                          accept="image/jpeg,image/png" 
                          className="hidden" 
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              const reader = new FileReader()
                              reader.onloadend = () => {
                                setForm(f => ({ ...f, image_url: reader.result as string }))
                                setImageError('')
                              }
                              reader.readAsDataURL(file)
                            }
                          }} 
                        />
                      </label>
                    )}
                  </div>
                  {/* URL input */}
                  <div className="md:col-span-2 flex flex-col justify-center space-y-2">
                    <p className="text-[10px] text-gray-400 font-bold leading-relaxed">
                      Tải ảnh JPG/PNG trực tiếp từ máy của bạn, dán URL ảnh, hoặc dán dữ liệu Base64 JPG/PNG vào ô bên dưới:
                    </p>
                    <input 
                      type="text" 
                      value={form.image_url} 
                      onChange={e => {
                        const value = e.target.value
                        setForm(f => ({ ...f, image_url: value }))
                        setImageError(getImageInputValidationMessage(value))
                      }} 
                      className={`w-full bg-[#F9FBF9] border rounded-2xl px-5 py-3 text-xs font-bold text-gray-900 focus:ring-4 transition-all ${imageError ? 'border-red-200 focus:ring-red-500/10' : 'border-gray-100 focus:ring-emerald-500/5'}`} 
                      placeholder="https://example.com/image.jpg hoặc dữ liệu Base64 JPG/PNG" 
                    />
                    {imageError && <p className="text-[10px] text-red-500 font-black uppercase tracking-wide">{imageError}</p>}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Khu vực trạm bếp</label>
                    <select value={form.station} onChange={e => setForm(f => ({ ...f, station: e.target.value }))} className="w-full bg-[#F9FBF9] border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold text-gray-900 focus:ring-4 focus:ring-emerald-500/5 transition-all appearance-none">
                       {STATIONS.map(s => <option key={s} value={s}>{STATION_LABELS[s]}</option>)}
                    </select>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Danh mục món</label>
                    <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))} className="w-full bg-[#F9FBF9] border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold text-gray-900 focus:ring-4 focus:ring-emerald-500/5 transition-all appearance-none">
                       <option value="" disabled>Chọn danh mục</option>
                       {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-8 p-6 bg-[#F9FBF9] rounded-[32px] border border-gray-50">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest px-1">Quota hôm nay</label>
                    <input type="number" value={form.daily_quota} onChange={e => setForm(f => ({ ...f, daily_quota: e.target.value }))} className="w-full bg-white border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold text-gray-900 focus:ring-4 focus:ring-emerald-500/5 transition-all" placeholder="50" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest px-1">Mặc định/Ngày</label>
                    <input type="number" value={form.daily_quota_default} onChange={e => setForm(f => ({ ...f, daily_quota_default: e.target.value }))} className="w-full bg-white border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold text-gray-900 focus:ring-4 focus:ring-emerald-500/5 transition-all" placeholder="50" />
                 </div>
              </div>
            </div>

            <div className="px-6 sm:px-10 py-6 sm:py-8 bg-gray-50 flex flex-col-reverse sm:flex-row gap-3 sm:gap-4 flex-shrink-0 border-t border-gray-100">
              <button onClick={() => setModalOpen(false)} className="flex-1 py-4 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-colors">
                Hủy bỏ
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-[2] bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60"
              >
                {saving ? <div className="w-5 h-5 border-4 border-white/30 border-t-white rounded-full animate-spin" /> : editItem ? 'Cập Nhật Món Ăn' : 'Thêm Vào Menu'}
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  )
}

export default AdminMenuPage

