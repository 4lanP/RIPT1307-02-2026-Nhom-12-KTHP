import React, { useState, useEffect } from 'react'
import { adminApi } from '../../lib/api'
import { getRoleLabel } from '../../lib/utils'
import { Modal, Form, Input, Select, Button } from 'antd'
import { Plus, Edit2, Trash2, Mail, Shield, Search } from 'lucide-react'
import toast from 'react-hot-toast'

const ROLES = ['ADMIN', 'MANAGER', 'CASHIER', 'KITCHEN', 'WAITER']
const ROLE_THEMES = {
  ADMIN: { color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100', gradient: 'from-purple-500 to-purple-600' },
  MANAGER: { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', gradient: 'from-blue-500 to-blue-600' },
  CASHIER: { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', gradient: 'from-emerald-500 to-emerald-600' },
  KITCHEN: { color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100', gradient: 'from-orange-500 to-orange-600' },
  WAITER: { color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-100', gradient: 'from-gray-500 to-gray-600' },
}

const defaultForm = { full_name: '', email: '', password: '', role: 'WAITER' }

const AdminUsersPage = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [form, setForm] = useState(defaultForm)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

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
    setForm({
      full_name: user.full_name || '',
      email: user.email || '',
      password: '',
      role: user.role || 'WAITER',
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    const payload = {
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      role: form.role,
    }
    if (payload.full_name.length < 2) {
      toast.error('Tên nhân viên phải có ít nhất 2 ký tự')
      return
    }
    if (!payload.email) {
      toast.error('Vui lòng nhập email')
      return
    }
    if (!editUser && form.password.length < 8) {
      toast.error('Mật khẩu phải có ít nhất 8 ký tự')
      return
    }

    setSaving(true)
    try {
      if (editUser) {
        await adminApi.updateUser(editUser.id, payload)
        toast.success('Đã cập nhật nhân viên')
      } else {
        await adminApi.createUser({ ...payload, password: form.password })
        toast.success('Đã tạo nhân viên mới')
      }
      setModalOpen(false)
      loadUsers()
    } catch (err) { toast.error(err?.message || 'Lỗi lưu dữ liệu') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Xác nhận xóa nhân viên này?')) return
    try {
      await adminApi.deleteUser(id)
      setUsers(prev => prev.filter(u => u.id !== id))
      toast.success('Đã xóa')
    } catch { toast.error('Lỗi xóa') }
  }

  const filteredUsers = users.filter(u =>
    (u.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Hệ Thống Nhân Sự</h1>
          <p className="text-gray-400 font-medium mt-1 text-base">3POS hiện đang có <span className="text-emerald-600 font-black">{users.length} nhân viên</span> vận hành.</p>
        </div>
        <button 
          onClick={openCreate} 
          className="flex items-center gap-2 bg-gray-900 text-white px-8 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-gray-200"
        >
          <Plus className="w-4 h-4" strokeWidth={3} />
          Thêm nhân viên
        </button>
      </div>

      {/* Search & Stats Section */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
         <div className="lg:col-span-3 bg-white p-4 rounded-[32px] border border-gray-100 shadow-sm flex items-center">
            <div className="relative w-full">
               <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
               <input 
                 type="text" 
                 value={search}
                 onChange={e => setSearch(e.target.value)}
                 placeholder="Tìm kiếm theo tên hoặc email..." 
                 className="w-full bg-[#F9FBF9] border-none rounded-2xl pl-14 pr-6 py-4 text-sm font-bold text-gray-900 focus:ring-4 focus:ring-emerald-500/5 transition-all"
               />
            </div>
         </div>
         <div className="bg-emerald-500 p-6 rounded-[32px] shadow-lg shadow-emerald-500/20 text-white flex flex-col justify-center">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Đang hoạt động</p>
            <p className="text-3xl font-black">{users.filter(u => u.is_active !== false).length} / {users.length}</p>
         </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="pl-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Nhân viên</th>
                <th className="px-6 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Vị trí / Quyền</th>
                <th className="px-6 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Email liên hệ</th>
                <th className="px-6 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Trạng thái</th>
                <th className="pr-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan="5" className="py-20 text-center"><div className="w-10 h-10 border-4 border-emerald-50 border-t-emerald-500 rounded-full animate-spin mx-auto" /></td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan="5" className="py-20 text-center text-gray-400 font-bold">Không tìm thấy nhân viên phù hợp</td></tr>
              ) : filteredUsers.map(user => {
                const theme = ROLE_THEMES[user.role] || ROLE_THEMES.WAITER
                return (
                  <tr key={user.id} className="group hover:bg-[#F9FBF9] transition-colors">
                    <td className="pl-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-[20px] bg-gradient-to-br ${theme.gradient} flex items-center justify-center text-white font-black text-lg shadow-lg shadow-emerald-950/5 group-hover:scale-105 transition-transform`}>
                          {user.full_name?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <p className="text-gray-900 font-black text-base leading-tight">{user.full_name}</p>
                          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-1">ID: #{String(user.id || '').slice(-4) || '----'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6">
                      <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border ${theme.bg} ${theme.color} ${theme.border} text-[10px] font-black uppercase tracking-widest shadow-sm`}>
                        <Shield className="w-3 h-3" />
                        {getRoleLabel(user.role)}
                      </div>
                    </td>
                    <td className="px-6">
                       <div className="flex items-center gap-2 text-gray-500 font-bold text-sm">
                          <Mail className="w-4 h-4 opacity-40" />
                          {user.email}
                       </div>
                    </td>
                    <td className="px-6">
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter ${user.is_active !== false ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                        {user.is_active !== false ? 'Hoạt động' : 'Vô hiệu'}
                      </span>
                    </td>
                    <td className="pr-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => openEdit(user)} className="w-10 h-10 bg-white border border-gray-100 rounded-xl flex items-center justify-center text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 hover:border-emerald-100 transition-all shadow-sm">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(user.id)} className="w-10 h-10 bg-white border border-gray-100 rounded-xl flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 hover:border-red-100 transition-all shadow-sm">
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

      {/* User Modal - Ant Design Integration */}
      <Modal
        title={<span className="text-xl font-black text-gray-900">{editUser ? 'Sửa Nhân Viên' : 'Thêm Nhân Viên'}</span>}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        centered
        width={480}
        styles={{
          mask: {
            backdropFilter: 'blur(6px)',
            backgroundColor: 'rgba(17, 24, 39, 0.4)'
          }
        }}
      >
        <Form
          layout="vertical"
          onFinish={handleSave}
          initialValues={form}
          className="mt-6 space-y-4"
        >
          <Form.Item
            label={<span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Họ và tên</span>}
            required
          >
            <Input
              value={form.full_name}
              onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
              placeholder="Nguyễn Văn A"
              className="w-full bg-[#F9FBF9] border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold text-gray-900 focus:ring-4 focus:ring-emerald-500/5 transition-all"
            />
          </Form.Item>

          <Form.Item
            label={<span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Địa chỉ Email</span>}
            required
          >
            <Input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="email@beanfarm.com"
              className="w-full bg-[#F9FBF9] border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold text-gray-900 focus:ring-4 focus:ring-emerald-500/5 transition-all"
            />
          </Form.Item>

          {!editUser && (
            <Form.Item
              label={<span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mật khẩu đăng nhập</span>}
              required
            >
              <Input.Password
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="••••••••"
                className="w-full bg-[#F9FBF9] border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold text-gray-900 focus:ring-4 focus:ring-emerald-500/5 transition-all"
              />
            </Form.Item>
          )}

          <Form.Item
            label={<span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Chức vụ / Vai trò</span>}
            required
          >
            <Select
              value={form.role}
              onChange={val => setForm(f => ({ ...f, role: val }))}
              options={ROLES.map(r => ({ label: getRoleLabel(r), value: r }))}
              className="w-full h-12 bg-[#F9FBF9] rounded-2xl font-bold"
            />
          </Form.Item>

          <div className="flex gap-4 pt-4 border-t border-gray-50 mt-6">
            <Button
              onClick={() => setModalOpen(false)}
              className="flex-1 h-12 border-none bg-gray-50 text-gray-500 rounded-xl font-bold hover:bg-gray-100 hover:text-gray-700"
            >
              Hủy bỏ
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={saving}
              className="flex-[2] h-12 bg-emerald-500 hover:bg-emerald-600 border-none text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20"
            >
              {editUser ? 'Cập Nhật' : 'Tạo Tài Khoản'}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  )
}

export default AdminUsersPage
