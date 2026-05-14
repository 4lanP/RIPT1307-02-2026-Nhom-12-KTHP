export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '0 ₫'
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount)
}

export const formatDate = (dateStr) => {
  if (!dateStr) return '—'
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr))
}

export const formatDateShort = (dateStr) => {
  if (!dateStr) return '—'
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr))
}

export const getStatusLabel = (status) => {
  const labels = {
    PENDING: 'Chờ xử lý',
    PREPARING: 'Đang chuẩn bị',
    READY: 'Sẵn sàng',
    SERVED: 'Đã phục vụ',
    CANCELLED: 'Đã hủy',
    ACTIVE: 'Đang hoạt động',
    CLOSED: 'Đã đóng',
    AVAILABLE: 'Còn trống',
    OCCUPIED: 'Có khách',
    OPEN: 'Mở',
    RESOLVED: 'Đã xử lý',
  }
  return labels[status] || status
}

export const getStatusClass = (status) => {
  const classes = {
    PENDING: 'badge-pending',
    PREPARING: 'badge-preparing',
    READY: 'badge-ready',
    SERVED: 'badge-served',
    CANCELLED: 'badge-cancelled',
    AVAILABLE: 'badge-available',
    OCCUPIED: 'badge-occupied',
    ACTIVE: 'badge-preparing',
    OPEN: 'badge-pending',
    RESOLVED: 'badge-served',
  }
  return classes[status] || 'badge'
}

export const getStationLabel = (station) => {
  const labels = {
    GRILL: '🔥 Nướng',
    BAR: '🍹 Bar',
    COLD: '🥗 Lạnh',
  }
  return labels[station] || station
}

export const getRoleLabel = (role) => {
  const labels = {
    ADMIN: 'Quản trị viên',
    MANAGER: 'Quản lý',
    CASHIER: 'Thu ngân',
    KITCHEN: 'Bếp',
    WAITER: 'Phục vụ',
  }
  return labels[role] || role
}
