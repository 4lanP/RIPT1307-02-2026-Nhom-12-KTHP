import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

let refreshPromise: Promise<string> | null = null
let sessionRefreshFailed = false

const clearAuthStorage = () => {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('user')
}

const redirectToLogin = () => {
  if (window.location.pathname !== '/login') {
    window.location.href = '/login'
  }
}

const requestFreshAccessToken = async () => {
  if (sessionRefreshFailed) {
    throw new Error('Refresh token is invalid or expired')
  }

  if (!refreshPromise) {
    const refreshToken = localStorage.getItem('refreshToken')
    if (!refreshToken) {
      throw new Error('Missing refresh token')
    }

    refreshPromise = axios.post(`${BASE_URL}/auth/refresh`, {
      refresh_token: refreshToken,
    }).then((res) => {
      const { accessToken, refreshToken: newRefresh } = res.data.data
      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('refreshToken', newRefresh)
      sessionRefreshFailed = false
      return accessToken
    }).catch((error) => {
      sessionRefreshFailed = true
      clearAuthStorage()
      throw error
    }).finally(() => {
      refreshPromise = null
    })
  }

  return refreshPromise
}

// Request interceptor — attach token
api.interceptors.request.use(
  (config) => {
    const isCustomerUrl = config.url?.startsWith('/customer')
    const token = isCustomerUrl
      ? (sessionStorage.getItem('session_token') || localStorage.getItem('accessToken'))
      : (localStorage.getItem('accessToken') || sessionStorage.getItem('session_token'))
      
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor — auto refresh
api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const original = error.config
    const isCustomerUrl = original?.url?.startsWith('/customer')
    const isAuthUrl = original?.url?.startsWith('/auth/')
    if (error.response?.status === 401 && original && !original._retry && !isCustomerUrl && !isAuthUrl) {
      original._retry = true
      try {
        const accessToken = await requestFreshAccessToken()
        original.headers = original.headers || {}
        original.headers.Authorization = `Bearer ${accessToken}`
        return api(original)
      } catch {
        redirectToLogin()
      }
    }
    return Promise.reject(error.response?.data || error)
  }
)

export default api

// Auth APIs
export const authApi = {
  login: async (data) => {
    sessionRefreshFailed = false
    return api.post('/auth/login', data)
  },
  refresh: (refresh_token) => api.post('/auth/refresh', { refresh_token }),
  logout: () => api.post('/auth/logout'),
}

// Customer APIs
export const customerApi = {
  scan: (qr_code) => api.post('/customer/scan', { qr_code }),
  getSession: () => api.get('/customer/session'),
  getMenu: (params) => api.get('/customer/menu', { params }),
  createOrder: (data) => api.post('/customer/orders', data),
  getOrders: () => api.get('/customer/orders'),
  createRequest: (request_type) => api.post('/customer/requests', { request_type }),
  createVNPayPayment: () => api.post('/customer/payment/vnpay'),
  getPaymentBankDetails: () => api.get('/customer/payment/bank-details'),
  requestBankTransfer: () => api.post('/customer/payment/bank-transfer'),
}

// KDS APIs
export const kdsApi = {
  getOrders: (station) => api.get('/kds/orders', { params: { station } }),
  updateItemStatus: (id, new_status) => api.patch(`/kds/items/${id}/status`, { new_status }),
}

// Staff APIs
export const staffApi = {
  getTables: () => api.get('/staff/tables'),
  getTableSession: (id) => api.get(`/staff/tables/${id}/session`),
  checkout: (sessionId, amount) => api.post(`/staff/sessions/${sessionId}/checkout`, { amount }),
  confirmBankTransfer: (sessionId) => api.post(`/staff/sessions/${sessionId}/confirm-bank-transfer`),
  getRequests: () => api.get('/staff/requests'),
  resolveRequest: (id) => api.patch(`/staff/requests/${id}/resolve`),
  cancelItem: (id) => api.patch(`/staff/orders/items/${id}/cancel`),
  forceClose: (sessionId) => api.post(`/staff/sessions/${sessionId}/force-close`),
  createInvoice: (sessionId) => api.post(`/staff/sessions/${sessionId}/invoice`),
  getInvoice: (invoiceId) => api.get(`/staff/invoices/${invoiceId}`),
  listSessionInvoices: (sessionId) => api.get(`/staff/sessions/${sessionId}/invoices`),
  recordInvoicePrintEvent: (invoiceId, printType) => api.post(`/staff/invoices/${invoiceId}/print-events`, { action: 'PRINT_INVOICE', print_type: printType }),
}

// Admin APIs
export const adminApi = {
  // Reports
  getRevenueReport: (params) => api.get('/admin/reports/revenue', { params }),
  getMenuReport: () => api.get('/admin/reports/menu'),
  getKdsReport: () => api.get('/admin/reports/kds'),
  exportReport: () => api.get('/admin/reports/export', { responseType: 'blob' }),
  sendDailyRevenueEmailNow: (data) => api.post('/admin/reports/daily-email/send-now', data),
  getDailyRevenueEmailStatus: () => api.get('/admin/reports/daily-email/status'),

  // Users
  getUsers: () => api.get('/admin/users'),
  createUser: (data) => api.post('/admin/users', data),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),

  // Tables
  getTables: () => api.get('/admin/tables'),
  createTable: (data) => api.post('/admin/tables', data),
  updateTable: (id, data) => api.put(`/admin/tables/${id}`, data),
  deleteTable: (id) => api.delete(`/admin/tables/${id}`),

  // QR Codes
  getQRCodes: () => api.get('/admin/qr_codes'),
  createQRCode: (data) => api.post('/admin/qr_codes', data),
  toggleQRCode: (id) => api.patch(`/admin/qr_codes/${id}/toggle`),
  deleteQRCode: (id) => api.delete(`/admin/qr_codes/${id}`),

  // Menu Categories
  getCategories: () => api.get('/admin/menu/categories'),
  createCategory: (data) => api.post('/admin/menu/categories', data),
  updateCategory: (id, data) => api.put(`/admin/menu/categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/admin/menu/categories/${id}`),

  // Menu Items
  getMenuItems: () => api.get('/admin/menu/items'),
  uploadBase64MenuImage: (data) => api.post('/admin/menu/images/base64', data),
  createMenuItem: (data) => api.post('/admin/menu/items', data),
  updateMenuItem: (id, data) => api.put(`/admin/menu/items/${id}`, data),
  deleteMenuItem: (id) => api.delete(`/admin/menu/items/${id}`),
  resetQuota: () => api.post('/admin/menu/reset-quota'),

  // Options
  getOptions: (itemId) => api.get(`/admin/menu/items/${itemId}/options`),
  createOption: (itemId, data) => api.post(`/admin/menu/items/${itemId}/options`, data),
  updateOption: (id, data) => api.put(`/admin/menu/options/${id}`, data),
  deleteOption: (id) => api.delete(`/admin/menu/options/${id}`),

  getBankConfig: () => api.get('/admin/settings/bank'),
  saveBankConfig: (data) => api.post('/admin/settings/bank', data),
}
