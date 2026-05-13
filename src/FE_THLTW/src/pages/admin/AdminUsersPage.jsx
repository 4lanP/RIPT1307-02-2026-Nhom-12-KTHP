import React, { useState, useEffect } from 'react'
import { adminApi } from '../../lib/api'
import { getRoleLabel, formatDateShort } from '../../lib/utils'
import { Users, Plus, Edit2, Trash2, X, Check, UserCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const ROLES = ['ADMIN', 'MANAGER', 'CASHIER', 'KITCHEN', 'WAITER']
const ROLE_COLORS = {
  ADMIN: 'from-purple-500 to-purple-700',
  MANAGER: 'from-blue-500 to-blue-700',
  CASHIER: 'from-emerald-500 to-emerald-700',
  KITCHEN: 'from-red-500 to-red-700',
  WAITER: 'from-orange-500 to-orange-700',
}

const defaultForm = { full_name: '', email: '', password: '', role: 'WAITER' }

const AdminUsersPage = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [form, setForm] = useState(defaultForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadUsers() }, [])

  const loadUsers = async () => {
    try {
      const res = await adminApi.getUsers()
      setUsers(res.data || [])
    } catch { toast.error('Không tải được danh sách') }
    finally { setLoading(false) }
  }

  const openCreate = () => {
    setEditUser(null)
    setForm(defaultForm)
    setModalOpen(true)
  }

  const openEdit = (user) => {
    setEditUser(user)
    setForm({ full_name: user.full_name, email: user.email, password: '', role: user.role })
    setModalOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editUser) {
        const data = { full_name: form.full_name, role: form.role }
        if (form.password) data.password = form.password
        await adminApi.updateUser(editUser.id, data)
        toast.success('Đã cập nhật nhân viên')
      } else {
        await adminApi.createUser(form)
        toast.success('Đã tạo nhân viên')
      }
      setModalOpen(false)
      loadUsers()
    } catch (err) { toast.error(err?.message || 'Lỗi lưu dữ liệu') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Xóa nhân viên này?')) return
    try {
      await adminApi.deleteUser(id)
      setUsers(prev => prev.filter(u => u.id !== id))
      toast.success('Đã xóa nhân viên')
    } catch { toast.error('Không thể xóa') }
  }

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <h1 className="section-title mb-0 flex items-center gap-2">
          <Users className="w-6 h-6 text-orange-400" />
          Quản lý nhân viên
        </h1>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Thêm nhân viên
        </button>
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center">
            <div className="w-8 h-8 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr className="px-6">
                <th className="px-6 py-4">Nhân viên</th>
                <th className="px-6 py-4">Vai trò</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Trạng thái</th>
                <th className="px-6 py-4 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className="group">
                  <td className="px-6">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${ROLE_COLORS[user.role] || 'from-gray-500 to-gray-700'} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                        {user.full_name?.[0] || 'U'}
                      </div>
                      <span className="text-white font-medium">{user.full_name}</span>
                    </div>
                  </td>
                  <td className="px-6">
                    <span className={`badge bg-gradient-to-r ${ROLE_COLORS[user.role] || ''} text-white text-xs`}>
                      {getRoleLabel(user.role)}
                    </span>
                  </td>
                  <td className="px-6 text-gray-400 text-sm">{user.email}</td>
                  <td className="px-6">
                    <span className={`badge ${user.is_active !== false ? 'badge-ready' : 'badge-cancelled'}`}>
                      {user.is_active !== false ? 'Hoạt động' : 'Vô hiệu'}
                    </span>
                  </td>
                  <td className="px-6 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(user)} className="p-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/40 text-blue-400 transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(user.id)} className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setModalOpen(false)} />
          <div className="relative glass-card p-6 w-full max-w-md animate-slide-in">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold text-lg">
                {editUser ? 'Sửa nhân viên' : 'Thêm nhân viên'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Họ tên</label>
                <input type="text" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} className="input-field" placeholder="Nguyễn Văn A" />
              </div>
              {!editUser && (
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="input-field" placeholder="email@restaurant.com" />
                </div>
              )}
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">{editUser ? 'Mật khẩu mới (để trống nếu không đổi)' : 'Mật khẩu'}</label>
                <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className="input-field" placeholder="••••••••" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Vai trò</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className="input-field">
                  {ROLES.map(r => <option key={r} value={r}>{getRoleLabel(r)}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setModalOpen(false)} className="btn-secondary flex-1">Hủy</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                {editUser ? 'Cập nhật' : 'Tạo mới'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminUsersPage
