export const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return '0 ₫'
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount)
}

export const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '—'
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr))
}

export const formatDateShort = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '—'
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr))
}

export const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
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

export const getStatusClass = (status: string): string => {
  const classes: Record<string, string> = {
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

export const getStationLabel = (station: string): string => {
  const labels: Record<string, string> = {
    GRILL: '🔥 Nướng',
    BAR: '🍹 Bar',
    COLD: '🥗 Lạnh',
  }
  return labels[station] || station
}

export const getRoleLabel = (role: string): string => {
  const labels: Record<string, string> = {
    ADMIN: 'Quản trị viên',
    MANAGER: 'Quản lý',
    CASHIER: 'Thu ngân',
    KITCHEN: 'Bếp',
    WAITER: 'Phục vụ',
  }
  return labels[role] || role
}
