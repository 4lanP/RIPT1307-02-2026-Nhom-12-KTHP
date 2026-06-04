import React, { useState, useEffect } from 'react'
import { adminApi } from '../../lib/api'
import { formatCurrency } from '../../lib/utils'
import ModalPortal from '../../components/ModalPortal'
import { buildImagePreviewSrc, getImageInputValidationMessage, resolveMenuImageUrl, isBase64ImageInput } from './adminMenuImage'
import { UtensilsCrossed, Plus, Edit2, Trash2, X, RefreshCw, Flame, Wine, Salad, Search, Image as ImageIcon, Upload, ChevronDown, Coins, FileText, Layers, Sliders } from 'lucide-react'
import toast from 'react-hot-toast'

const STATIONS = ['GRILL', 'BAR', 'COLD']
const STATION_ICONS = { GRILL: Flame, BAR: Wine, COLD: Salad }
const STATION_LABELS = { GRILL: 'Bếp Nướng', BAR: 'Pha Chế', COLD: 'Bếp Salad' }
const STATION_COLORS = { 
  GRILL: 'bg-orange-50/70 text-orange-600 border-orange-100/70', 
  BAR: 'bg-blue-50/70 text-blue-600 border-blue-100/70', 
  COLD: 'bg-emerald-50/70 text-emerald-600 border-emerald-100/70' 
}

const defaultItem = { name: '', description: '', price: '', station: 'GRILL', category_id: '', daily_quota: '', daily_quota_default: '', image_url: '' }

const parseNumberInput = (value) => Number(String(value).replace(',', '.'))

const AdminMenuPage = () => {
  const [categories, setCategories] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [form, setForm] = useState(defaultItem)
  const [saving, setSaving] = useState(false)
  const [stationFilter, setStationFilter] = useState('')
  const [resetting, setResetting] = useState(false)
  const [search, setSearch] = useState('')
  const [imageError, setImageError] = useState('')

  // New Category State
  const [activeTab, setActiveTab] = useState<'ITEMS' | 'CATEGORIES'>('ITEMS')
  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const [editCategory, setEditCategory] = useState<any>(null)
  const [categoryForm, setCategoryForm] = useState({ name: '', station: 'GRILL', sort_order: '0', is_active: true })

  // New Option State
  const [optionsModalOpen, setOptionsModalOpen] = useState(false)
  const [activeItemForOptions, setActiveItemForOptions] = useState<any>(null)
  const [options, setOptions] = useState<any[]>([])
  const [optionsLoading, setOptionsLoading] = useState(false)
  const [editOption, setEditOption] = useState<any>(null)
  const [optionForm, setOptionForm] = useState({ option_group: '', option_name: '', extra_price: '0' })

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

  // Categories Handlers
  const openCreateCategory = () => {
    setEditCategory(null)
    setCategoryForm({ name: '', station: 'GRILL', sort_order: '0', is_active: true })
    setCategoryModalOpen(true)
  }

  const openEditCategory = (cat: any) => {
    setEditCategory(cat)
    setCategoryForm({
      name: cat.name,
      station: cat.station,
      sort_order: String(cat.sort_order ?? 0),
      is_active: cat.is_active !== false,
    })
    setCategoryModalOpen(true)
  }

  const handleSaveCategory = async () => {
    if (!categoryForm.name.trim()) {
      toast.error('Vui lòng nhập tên danh mục')
      return
    }
    const sortOrder = Number(categoryForm.sort_order)
    const payload = {
      name: categoryForm.name.trim(),
      station: categoryForm.station,
      sort_order: Number.isInteger(sortOrder) ? sortOrder : 0,
      is_active: categoryForm.is_active,
    }
    setSaving(true)
    try {
      if (editCategory) {
        await adminApi.updateCategory(editCategory.id, payload)
        toast.success('Đã cập nhật danh mục')
      } else {
        await adminApi.createCategory(payload)
        toast.success('Đã thêm danh mục mới')
      }
      setCategoryModalOpen(false)
      loadAll()
    } catch (err: any) {
      toast.error(err?.errors?.[0]?.message || err?.message || 'Lỗi lưu danh mục')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteCategory = async (catId: any) => {
    if (!confirm('Xác nhận xóa danh mục này?')) return
    try {
      await adminApi.deleteCategory(catId)
      toast.success('Đã xóa danh mục')
      loadAll()
    } catch {
      toast.error('Lỗi xóa danh mục (có thể đang chứa món ăn)')
    }
  }

  // Options Handlers
  const loadOptions = async (itemId: any) => {
    setOptionsLoading(true)
    try {
      const res = await adminApi.getOptions(itemId)
      setOptions(res.data || [])
    } catch {
      toast.error('Không tải được danh sách tùy chọn')
    } finally {
      setOptionsLoading(false)
    }
  }

  const openOptionsModal = (item: any) => {
    setActiveItemForOptions(item)
    setOptionForm({ option_group: '', option_name: '', extra_price: '0' })
    setEditOption(null)
    setOptionsModalOpen(true)
    loadOptions(item.id)
  }

  const handleSaveOption = async () => {
    if (!optionForm.option_group.trim()) {
      toast.error('Vui lòng nhập nhóm tùy chọn (ví dụ: Size, Đá, Đường)')
      return
    }
    if (!optionForm.option_name.trim()) {
      toast.error('Vui lòng nhập tên tùy chọn (ví dụ: Lớn, 50% Đá)')
      return
    }
    const extraPrice = Number(optionForm.extra_price)
    const payload = {
      option_group: optionForm.option_group.trim(),
      option_name: optionForm.option_name.trim(),
      extra_price: Number.isFinite(extraPrice) && extraPrice >= 0 ? extraPrice : 0,
      is_available: true,
    }
    setSaving(true)
    try {
      if (editOption) {
        await adminApi.updateOption(editOption.id, payload)
        toast.success('Đã cập nhật tùy chọn')
      } else {
        await adminApi.createOption(activeItemForOptions.id, payload)
        toast.success('Đã thêm tùy chọn mới')
      }
      setOptionForm({ option_group: '', option_name: '', extra_price: '0' })
      setEditOption(null)
      loadOptions(activeItemForOptions.id)
    } catch (err: any) {
      toast.error(err?.errors?.[0]?.message || err?.message || 'Lỗi lưu tùy chọn')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteOption = async (optId: any) => {
    if (!confirm('Xác nhận xóa tùy chọn này?')) return
    try {
      await adminApi.deleteOption(optId)
      toast.success('Đã xóa tùy chọn')
      loadOptions(activeItemForOptions.id)
    } catch {
      toast.error('Lỗi xóa tùy chọn')
    }
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
    } catch (error: any) {
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
          <p className="text-gray-400 font-medium mt-1 text-base">
            {activeTab === 'ITEMS' 
              ? `Tổng số ${items.length} món ăn đang kinh doanh tại 3POS.` 
              : `Tổng số ${categories.length} danh mục món ăn tại 3POS.`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {activeTab === 'ITEMS' ? (
            <>
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
            </>
          ) : (
            <button
              onClick={openCreateCategory}
              disabled={loading}
              className="flex items-center gap-2 bg-gray-900 text-white px-8 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" strokeWidth={3} />
              Thêm danh mục mới
            </button>
          )}
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-6 border-b border-slate-100 pb-px">
        <button
          onClick={() => setActiveTab('ITEMS')}
          className={`flex items-center gap-2 pb-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all relative ${
            activeTab === 'ITEMS'
              ? 'border-emerald-500 text-slate-850'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <UtensilsCrossed className="w-4 h-4" />
          Món ăn
        </button>
        <button
          onClick={() => setActiveTab('CATEGORIES')}
          className={`flex items-center gap-2 pb-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all relative ${
            activeTab === 'CATEGORIES'
              ? 'border-emerald-500 text-slate-850'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Layers className="w-4 h-4" />
          Danh mục
        </button>
      </div>

      {activeTab === 'ITEMS' ? (
        <>
          {/* Filters & Search */}
          <div className="bg-white/80 backdrop-blur-md p-5 rounded-[28px] border border-slate-100 shadow-sm flex flex-col lg:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
               <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
               <input 
                 type="text" 
                 value={search}
                 onChange={e => setSearch(e.target.value)}
                 placeholder="Tìm kiếm món ăn..." 
                 className="w-full bg-slate-50/60 border border-slate-100 rounded-2xl pl-14 pr-6 py-4 text-sm font-bold text-slate-800 placeholder-slate-400 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none"
               />
            </div>
            
            <div className="flex gap-2 w-full lg:w-auto overflow-x-auto pb-2 lg:pb-0">
              <button
                onClick={() => setStationFilter('')}
                className={`px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-200 whitespace-nowrap border
                  ${!stationFilter ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/10' : 'bg-slate-50 border-slate-50 text-slate-400 hover:bg-slate-100/50 hover:text-slate-650'}`}
              >
                Tất cả
              </button>
              {STATIONS.map(s => {
                const Icon = STATION_ICONS[s]
                return (
                  <button
                    key={s}
                    onClick={() => setStationFilter(s)}
                    className={`flex items-center gap-2 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-200 whitespace-nowrap border
                      ${stationFilter === s ? `${STATION_COLORS[s]} border shadow-sm` : 'bg-slate-50 border-slate-50 text-slate-400 hover:bg-slate-100/50 hover:text-slate-650'}`}
                  >
                    <Icon className="w-4 h-4" />
                    {STATION_LABELS[s]}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Menu Table */}
          <div className="bg-white/80 backdrop-blur-md rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-left min-w-[850px]">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="pl-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap bg-slate-50/50">Món ăn</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap bg-slate-50/50">Phân loại</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap bg-slate-50/50">Giá bán</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap bg-slate-50/50">Quota</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap bg-slate-50/50">Trạng thái</th>
                    <th className="pr-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap bg-slate-50/50">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                     <tr><td colSpan={6} className="py-20 text-center"><div className="w-10 h-10 border-4 border-emerald-50 border-t-emerald-500 rounded-full animate-spin mx-auto" /></td></tr>
                  ) : filteredItems.length === 0 ? (
                     <tr><td colSpan={6} className="py-20 text-center text-slate-400 font-bold">Không tìm thấy món ăn nào</td></tr>
                  ) : filteredItems.map(item => {
                    const StationIcon = STATION_ICONS[item.station] || UtensilsCrossed
                    const colorClass = STATION_COLORS[item.station] || 'bg-slate-50 text-slate-500'
                    return (
                      <tr key={item.id} className="group hover:bg-slate-50/40 transition-colors">
                        <td className="pl-8 py-5">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-emerald-500 border border-slate-100 group-hover:scale-105 group-hover:shadow-sm transition-all overflow-hidden relative">
                              {item.image_url ? (
                                <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                              ) : (
                                <UtensilsCrossed className="w-6 h-6 text-slate-400" />
                              )}
                            </div>
                            <div>
                              <p className="text-slate-900 font-black text-base leading-tight tracking-tight">{item.name}</p>
                              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">ID: #{String(item.id || '----')}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 whitespace-nowrap">
                          <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border ${colorClass} text-[9px] font-black uppercase tracking-widest shadow-sm whitespace-nowrap`}>
                            <StationIcon className="w-3 h-3" />
                            {STATION_LABELS[item.station] || item.station}
                          </div>
                        </td>
                        <td className="px-6 whitespace-nowrap">
                          <span className="text-slate-900 font-black text-base whitespace-nowrap tracking-tight">{formatCurrency(item.price)}</span>
                        </td>
                        <td className="px-6 text-center whitespace-nowrap">
                           <div className="flex flex-col items-center">
                              <span className="text-slate-900 font-black text-sm">{item.daily_quota ?? '∞'}</span>
                              <div className="w-12 h-1 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                                 <div className="h-full bg-emerald-500 rounded-full" style={{ width: item.daily_quota_default ? `${Math.max(0, Math.min(100, (item.daily_quota / item.daily_quota_default) * 100))}%` : '100%' }} />
                              </div>
                              <span className="text-[8px] font-black text-slate-400 uppercase mt-1">/ {item.daily_quota_default ?? '∞'}</span>
                           </div>
                        </td>
                        <td className="px-6 whitespace-nowrap">
                          <span className={`px-3.5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest whitespace-nowrap border ${item.is_available ? 'bg-emerald-50/70 text-emerald-600 border-emerald-100/70' : 'bg-red-50/70 text-red-600 border-red-100/70'}`}>
                            {item.is_available ? 'Sẵn sàng' : 'Tạm hết'}
                          </span>
                        </td>
                        <td className="pr-8 py-5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-3 md:opacity-0 md:group-hover:opacity-100 opacity-100 transition-all duration-200">
                            <button 
                              onClick={() => openOptionsModal(item)} 
                              title="Tùy chọn món ăn" 
                              className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 hover:border-emerald-100 transition-all duration-200 shadow-sm active:scale-95"
                            >
                              <Sliders className="w-4 h-4" />
                            </button>
                            <button onClick={() => openEdit(item)} className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 hover:border-emerald-100 transition-all duration-200 shadow-sm active:scale-95">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(item.id)} className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 hover:border-red-100 transition-all duration-200 shadow-sm active:scale-95">
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
        </>
      ) : (
        /* Categories Table */
        <div className="bg-white/80 backdrop-blur-md rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left min-w-[750px]">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="pl-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap bg-slate-50/50">Danh mục</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap bg-slate-50/50">Trạm mặc định</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap bg-slate-50/50">Thứ tự sắp xếp</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap bg-slate-50/50">Trạng thái</th>
                  <th className="pr-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap bg-slate-50/50">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                   <tr><td colSpan={5} className="py-20 text-center"><div className="w-10 h-10 border-4 border-emerald-50 border-t-emerald-500 rounded-full animate-spin mx-auto" /></td></tr>
                ) : categories.length === 0 ? (
                   <tr><td colSpan={5} className="py-20 text-center text-slate-400 font-bold">Không tìm thấy danh mục nào</td></tr>
                ) : categories.map(cat => {
                  const StationIcon = STATION_ICONS[cat.station] || UtensilsCrossed
                  const colorClass = STATION_COLORS[cat.station] || 'bg-slate-50 text-slate-500'
                  return (
                    <tr key={cat.id} className="group hover:bg-slate-50/40 transition-colors">
                      <td className="pl-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-emerald-500 border border-slate-100">
                            <Layers className="w-5 h-5 text-slate-400" />
                          </div>
                          <div>
                            <p className="text-slate-900 font-black text-base leading-tight tracking-tight">{cat.name}</p>
                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">ID: #{String(cat.id || '----')}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 whitespace-nowrap">
                        <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border ${colorClass} text-[9px] font-black uppercase tracking-widest shadow-sm whitespace-nowrap`}>
                          <StationIcon className="w-3 h-3" />
                          {STATION_LABELS[cat.station] || cat.station}
                        </div>
                      </td>
                      <td className="px-6 text-center whitespace-nowrap">
                        <span className="text-slate-900 font-bold text-sm bg-slate-50 border border-slate-100 px-3 py-1 rounded-lg">{cat.sort_order ?? 0}</span>
                      </td>
                      <td className="px-6 whitespace-nowrap">
                        <span className={`px-3.5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest whitespace-nowrap border ${cat.is_active !== false ? 'bg-emerald-50/70 text-emerald-600 border-emerald-100/70' : 'bg-red-50/70 text-red-600 border-red-100/70'}`}>
                          {cat.is_active !== false ? 'Hoạt động' : 'Tạm khóa'}
                        </span>
                      </td>
                      <td className="pr-8 py-5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-3 md:opacity-0 md:group-hover:opacity-100 opacity-100 transition-all duration-200">
                          <button onClick={() => openEditCategory(cat)} className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 hover:border-emerald-100 transition-all duration-200 shadow-sm active:scale-95">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteCategory(cat.id)} className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 hover:border-red-100 transition-all duration-200 shadow-sm active:scale-95">
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
      )}

      {/* Item Modal */}
      {modalOpen && (
        <ModalPortal>
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md animate-fade-in" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white rounded-[32px] sm:rounded-[40px] shadow-2xl w-full max-w-4xl max-h-[calc(100vh-3rem)] animate-[bounce-in_0.4s_ease-out] overflow-hidden flex flex-col">
            <div className="px-10 py-7 border-b border-slate-100 flex items-center justify-between">
               <div>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight">{editItem ? 'Chỉnh Sửa Món Ăn' : 'Thêm Món Mới'}</h3>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Thông tin chi tiết thực đơn</p>
               </div>
               <button onClick={() => setModalOpen(false)} className="w-10 h-10 bg-slate-50 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl flex items-center justify-center transition-all duration-200">
                  <X className="w-5 h-5" strokeWidth={3} />
               </button>
            </div>
            
            <div className="p-6 sm:p-10 space-y-6 overflow-y-auto custom-scrollbar flex-1">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left column - Form fields */}
                <div className="lg:col-span-7 space-y-6">
                  {/* Name input */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Tên món ăn</label>
                    <div className="relative">
                      <UtensilsCrossed className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" 
                        value={form.name} 
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))} 
                        className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold text-slate-800 placeholder-slate-400 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none" 
                        placeholder="Ví dụ: Bít tết bò Mỹ" 
                      />
                    </div>
                  </div>

                  {/* Price input */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Giá bán (VND)</label>
                    <div className="relative">
                      <Coins className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="number" 
                        value={form.price} 
                        onChange={e => setForm(f => ({ ...f, price: e.target.value }))} 
                        className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold text-slate-800 placeholder-slate-400 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none" 
                        placeholder="150000" 
                      />
                    </div>
                  </div>

                  {/* Quotas sub-container */}
                  <div className="grid grid-cols-2 gap-4 p-5 bg-emerald-50/20 rounded-[28px] border border-emerald-100/50">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest px-1">Quota hôm nay</label>
                        <input 
                          type="number" 
                          value={form.daily_quota} 
                          onChange={e => setForm(f => ({ ...f, daily_quota: e.target.value }))} 
                          className="w-full bg-white border border-slate-100 rounded-xl px-4 py-3.5 text-sm font-bold text-slate-800 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none" 
                          placeholder="50" 
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest px-1">Mặc định/Ngày</label>
                        <input 
                          type="number" 
                          value={form.daily_quota_default} 
                          onChange={e => setForm(f => ({ ...f, daily_quota_default: e.target.value }))} 
                          className="w-full bg-white border border-slate-100 rounded-xl px-4 py-3.5 text-sm font-bold text-slate-800 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none" 
                          placeholder="50" 
                        />
                     </div>
                  </div>
                </div>

                {/* Right column - Media & Taxonomy */}
                <div className="lg:col-span-5 space-y-6">
                  {/* Image upload area */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Hình ảnh món ăn</label>
                    <div className="space-y-4">
                      {/* Upload box */}
                      <div className="h-44 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center relative overflow-hidden group hover:border-emerald-500 hover:bg-emerald-50/5 transition-all duration-300 bg-slate-50/50">
                        {imagePreviewSrc ? (
                          <>
                            <img src={imagePreviewSrc} alt="Preview" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                              <button 
                                type="button"
                                onClick={() => {
                                  setForm(f => ({ ...f, image_url: '' }))
                                  setImageError('')
                                }}
                                className="w-10 h-10 bg-red-500 hover:bg-red-650 text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all duration-200"
                              >
                                <X className="w-5 h-5" strokeWidth={3} />
                              </button>
                            </div>
                          </>
                        ) : form.image_url.trim() ? (
                          <div className="flex flex-col items-center justify-center p-4 text-center">
                            <ImageIcon className="w-8 h-8 text-red-400 mb-2" />
                            <span className="text-[10px] font-black text-red-500 uppercase tracking-wider">Ảnh chưa hợp lệ</span>
                          </div>
                        ) : (
                          <label className="cursor-pointer flex flex-col items-center justify-center p-4 w-full h-full text-center">
                            <Upload className="w-7 h-7 text-slate-400 group-hover:text-emerald-500 mb-2 transition-colors duration-200" />
                            <span className="text-[10px] font-black text-slate-400 group-hover:text-emerald-600 uppercase tracking-wider transition-colors duration-200">Tải ảnh lên</span>
                            <span className="text-[8px] text-slate-400 mt-1">Hỗ trợ JPG, PNG</span>
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
                      <div className="space-y-2">
                        <p className="text-[10px] text-slate-400 font-bold leading-relaxed px-1">
                          Hoặc dán URL ảnh / dữ liệu Base64:
                        </p>
                        <input 
                          type="text" 
                          value={isBase64ImageInput(form.image_url) ? 'Đã tải ảnh lên từ thiết bị' : form.image_url} 
                          disabled={isBase64ImageInput(form.image_url)}
                          onChange={e => {
                            const value = e.target.value
                            setForm(f => ({ ...f, image_url: value }))
                            setImageError(getImageInputValidationMessage(value))
                          }} 
                          className={`w-full bg-slate-50/50 border rounded-2xl px-5 py-3.5 text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none ${imageError ? 'border-red-200 focus:ring-red-500/10' : 'border-slate-100 focus:ring-emerald-500/5'} ${isBase64ImageInput(form.image_url) ? 'opacity-70 cursor-not-allowed select-none' : ''}`} 
                          placeholder="https://example.com/image.jpg" 
                        />
                        {imageError && <p className="text-[10px] text-red-500 font-black uppercase tracking-wide px-1 mt-1">{imageError}</p>}
                      </div>
                    </div>
                  </div>

                  {/* Taxonomy */}
                  <div className="space-y-4 pt-2">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Danh mục món</label>
                        <div className="relative">
                          <select 
                            value={form.category_id} 
                            onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))} 
                            className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl pl-6 pr-12 py-4 text-sm font-bold text-slate-800 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all appearance-none outline-none"
                          >
                             <option value="" disabled>Chọn danh mục</option>
                             {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                          <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                     </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 sm:px-10 py-6 sm:py-7 bg-slate-50 flex flex-col-reverse sm:flex-row gap-3 sm:gap-4 flex-shrink-0 border-t border-slate-100">
              <button onClick={() => setModalOpen(false)} className="flex-1 py-4 px-6 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-650 hover:bg-slate-100/50 rounded-2xl transition-colors duration-200">
                Hủy bỏ
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-[2] bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black py-4 px-6 rounded-2xl shadow-md shadow-emerald-500/10 hover:shadow-lg hover:shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none"
              >
                {saving ? <div className="w-5 h-5 border-4 border-white/30 border-t-white rounded-full animate-spin" /> : editItem ? 'Cập Nhật Món Ăn' : 'Thêm Vào Menu'}
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* Category Modal */}
      {categoryModalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md animate-fade-in" onClick={() => setCategoryModalOpen(false)} />
            <div className="relative bg-white rounded-[32px] sm:rounded-[40px] shadow-2xl w-full max-w-lg max-h-[calc(100vh-3rem)] animate-[bounce-in_0.4s_ease-out] overflow-hidden flex flex-col">
              <div className="px-10 py-7 border-b border-slate-100 flex items-center justify-between">
                 <div>
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">{editCategory ? 'Chỉnh Sửa Danh Mục' : 'Thêm Danh Mục Mới'}</h3>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Thông tin phân loại</p>
                 </div>
                 <button onClick={() => setCategoryModalOpen(false)} className="w-10 h-10 bg-slate-50 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl flex items-center justify-center transition-all duration-200">
                    <X className="w-5 h-5" strokeWidth={3} />
                 </button>
              </div>
              
              <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                {/* Category Name */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Tên danh mục</label>
                  <input 
                    type="text" 
                    value={categoryForm.name} 
                    onChange={e => setCategoryForm(f => ({ ...f, name: e.target.value }))} 
                    className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-slate-800 placeholder-slate-400 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none" 
                    placeholder="Ví dụ: Đồ uống, Khai vị" 
                  />
                </div>

                {/* Default Station dropdown */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Khu vực trạm bếp mặc định</label>
                  <div className="relative">
                    <select 
                      value={categoryForm.station} 
                      onChange={e => setCategoryForm(f => ({ ...f, station: e.target.value }))} 
                      className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl pl-6 pr-12 py-4 text-sm font-bold text-slate-800 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all appearance-none outline-none"
                    >
                       {STATIONS.map(s => <option key={s} value={s}>{STATION_LABELS[s]}</option>)}
                    </select>
                    <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Sort order and is_active */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Thứ tự sắp xếp</label>
                    <input 
                      type="number" 
                      value={categoryForm.sort_order} 
                      onChange={e => setCategoryForm(f => ({ ...f, sort_order: e.target.value }))} 
                      className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-slate-800 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none" 
                      placeholder="0" 
                    />
                  </div>

                  <div className="space-y-2 flex flex-col justify-end pb-3 pl-2">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={categoryForm.is_active} 
                        onChange={e => setCategoryForm(f => ({ ...f, is_active: e.target.checked }))} 
                        className="w-5 h-5 text-emerald-500 border-slate-200 rounded focus:ring-emerald-500/20 focus:ring-4 transition-all"
                      />
                      <span className="text-xs font-black uppercase tracking-widest text-slate-500">Hoạt động</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="px-8 py-6 bg-slate-50 flex gap-4 flex-shrink-0 border-t border-slate-100">
                <button onClick={() => setCategoryModalOpen(false)} className="flex-1 py-4 px-6 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-650 hover:bg-slate-100/50 rounded-2xl transition-colors duration-200">
                  Hủy bỏ
                </button>
                <button
                  onClick={handleSaveCategory}
                  disabled={saving}
                  className="flex-[2] bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black py-4 px-6 rounded-2xl shadow-md shadow-emerald-500/10 hover:shadow-lg hover:shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none"
                >
                  {saving ? <div className="w-5 h-5 border-4 border-white/30 border-t-white rounded-full animate-spin" /> : editCategory ? 'Cập Nhật Danh Mục' : 'Thêm Mới'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Options Management Modal */}
      {optionsModalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md animate-fade-in" onClick={() => setOptionsModalOpen(false)} />
            <div className="relative bg-white rounded-[32px] sm:rounded-[40px] shadow-2xl w-full max-w-4xl max-h-[calc(100vh-3rem)] animate-[bounce-in_0.4s_ease-out] overflow-hidden flex flex-col">
              <div className="px-10 py-7 border-b border-slate-100 flex items-center justify-between">
                 <div>
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">Tùy Chọn Món Ăn</h3>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Món ăn: {activeItemForOptions?.name}</p>
                 </div>
                 <button onClick={() => setOptionsModalOpen(false)} className="w-10 h-10 bg-slate-50 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl flex items-center justify-center transition-all duration-200">
                    <X className="w-5 h-5" strokeWidth={3} />
                 </button>
              </div>

              <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Left Column: List of existing options */}
                  <div className="lg:col-span-7 space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Danh sách tùy chọn hiện có</h4>
                    <div className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/30">
                      <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/80">
                              <th className="pl-6 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Nhóm</th>
                              <th className="px-4 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Tên tùy chọn</th>
                              <th className="px-4 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Phụ thu</th>
                              <th className="pr-6 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Thao tác</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {optionsLoading ? (
                              <tr>
                                <td colSpan={4} className="py-12 text-center">
                                  <div className="w-6 h-6 border-2 border-emerald-50 border-t-emerald-500 rounded-full animate-spin mx-auto" />
                                </td>
                              </tr>
                            ) : options.length === 0 ? (
                              <tr>
                                <td colSpan={4} className="py-12 text-center text-xs font-bold text-slate-400">
                                  Món ăn chưa có tùy chọn nào. Hãy tạo ở form bên phải!
                                </td>
                              </tr>
                            ) : (
                              options.map(opt => (
                                <tr key={opt.id} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="pl-6 py-3.5">
                                    <span className="text-slate-800 font-bold text-xs bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100/50">{opt.option_group}</span>
                                  </td>
                                  <td className="px-4 py-3.5">
                                    <span className="text-slate-900 font-black text-sm">{opt.option_name}</span>
                                  </td>
                                  <td className="px-4 py-3.5 text-right whitespace-nowrap">
                                    <span className="text-slate-900 font-black text-xs text-emerald-600">+{formatCurrency(opt.extra_price)}</span>
                                  </td>
                                  <td className="pr-6 py-3.5 text-right whitespace-nowrap">
                                    <div className="flex items-center justify-end gap-2">
                                      <button 
                                        onClick={() => {
                                          setEditOption(opt)
                                          setOptionForm({
                                            option_group: opt.option_group,
                                            option_name: opt.option_name,
                                            extra_price: String(opt.extra_price ?? 0)
                                          })
                                        }} 
                                        className="w-8 h-8 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-500 text-slate-400 rounded-lg flex items-center justify-center transition-all duration-150"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                      <button 
                                        onClick={() => handleDeleteOption(opt.id)} 
                                        className="w-8 h-8 bg-slate-50 hover:bg-red-50 hover:text-red-500 text-slate-400 rounded-lg flex items-center justify-center transition-all duration-150"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Add/Edit Form */}
                  <div className="lg:col-span-5 space-y-6 bg-slate-50/50 p-6 rounded-[24px] border border-slate-100">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
                      {editOption ? 'Cập nhật tùy chọn' : 'Thêm tùy chọn mới'}
                    </h4>

                    {/* Option Group */}
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Nhóm tùy chọn</label>
                      <input 
                        type="text" 
                        value={optionForm.option_group} 
                        onChange={e => setOptionForm(f => ({ ...f, option_group: e.target.value }))} 
                        className="w-full bg-white border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none" 
                        placeholder="Ví dụ: Size, Đá, Topping, Đế bánh" 
                      />
                    </div>

                    {/* Option Name */}
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Tên tùy chọn</label>
                      <input 
                        type="text" 
                        value={optionForm.option_name} 
                        onChange={e => setOptionForm(f => ({ ...f, option_name: e.target.value }))} 
                        className="w-full bg-white border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none" 
                        placeholder="Ví dụ: Lớn, Ít đá, Thêm phô mai" 
                      />
                    </div>

                    {/* Extra Price */}
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Phụ thu (VND)</label>
                      <input 
                        type="number" 
                        value={optionForm.extra_price} 
                        onChange={e => setOptionForm(f => ({ ...f, extra_price: e.target.value }))} 
                        className="w-full bg-white border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none" 
                        placeholder="0" 
                      />
                    </div>

                    <div className="flex gap-2 pt-2">
                      {editOption && (
                        <button 
                          onClick={() => {
                            setEditOption(null)
                            setOptionForm({ option_group: '', option_name: '', extra_price: '0' })
                          }} 
                          className="flex-1 py-3 px-4 bg-white border border-slate-100 text-slate-400 hover:text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                        >
                          Hủy
                        </button>
                      )}
                      <button
                        onClick={handleSaveOption}
                        disabled={saving}
                        className="flex-[2] bg-emerald-500 hover:bg-emerald-600 text-white font-black py-3 px-4 rounded-xl text-xs uppercase tracking-widest shadow-md shadow-emerald-500/10 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60"
                      >
                        {saving ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : editOption ? (
                          'Cập nhật'
                        ) : (
                          'Thêm tùy chọn'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-8 py-5 bg-slate-50 flex justify-end border-t border-slate-100">
                <button onClick={() => setOptionsModalOpen(false)} className="py-3 px-8 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all">
                  Đóng
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
