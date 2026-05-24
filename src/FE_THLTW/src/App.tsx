import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './contexts/AuthContext'

// Layouts
import StaffLayout from './layouts/StaffLayout'

// Auth
import LoginPage from './pages/auth/LoginPage'

// Customer
import CustomerScanPage from './pages/customer/CustomerScanPage'
import CustomerMenuPage from './pages/customer/CustomerMenuPage'

// KDS
import KDSPage from './pages/kds/KDSPage'

// Staff
import StaffTablesPage from './pages/staff/StaffTablesPage'
import StaffTableDetailPage from './pages/staff/StaffTableDetailPage'
import StaffRequestsPage from './pages/staff/StaffRequestsPage'

// Admin
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import AdminUsersPage from './pages/admin/AdminUsersPage'
import AdminTablesPage from './pages/admin/AdminTablesPage'
import AdminMenuPage from './pages/admin/AdminMenuPage'
import AdminReportsPage from './pages/admin/AdminReportsPage'
import AdminQRPage from './pages/admin/AdminQRPage'

interface ProtectedRouteProps {
  children: React.ReactNode
  roles?: string[]
}

const ProtectedRoute = ({ children, roles }: ProtectedRouteProps) => {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to={getDefaultRoute(user.role)} replace />
  return children as React.ReactElement
}

const AppRoutes = () => {
  const { user } = useAuth()

  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={user ? <Navigate to={getDefaultRoute(user.role)} /> : <LoginPage />} />

      {/* Customer QR flow */}
      <Route path="/scan" element={<CustomerScanPage />} />
      <Route path="/menu" element={<CustomerMenuPage />} />

      {/* KDS */}
      <Route path="/kds" element={
        <ProtectedRoute roles={['KITCHEN', 'ADMIN']}>
          <KDSPage />
        </ProtectedRoute>
      } />

      {/* Staff */}
      <Route path="/" element={
        <ProtectedRoute roles={['ADMIN', 'MANAGER', 'CASHIER', 'WAITER']}>
          <StaffLayout />
        </ProtectedRoute>
      }>
        <Route path="tables" element={<StaffTablesPage />} />
        <Route path="tables/:id" element={<StaffTableDetailPage />} />
        <Route path="requests" element={<StaffRequestsPage />} />
        <Route path="admin/dashboard" element={
          <ProtectedRoute roles={['ADMIN', 'MANAGER']}>
            <AdminDashboardPage />
          </ProtectedRoute>
        } />
        <Route path="admin/users" element={
          <ProtectedRoute roles={['ADMIN']}>
            <AdminUsersPage />
          </ProtectedRoute>
        } />
        <Route path="admin/tables" element={
          <ProtectedRoute roles={['ADMIN', 'MANAGER']}>
            <AdminTablesPage />
          </ProtectedRoute>
        } />
        <Route path="admin/menu" element={
          <ProtectedRoute roles={['ADMIN', 'MANAGER']}>
            <AdminMenuPage />
          </ProtectedRoute>
        } />
        <Route path="admin/reports" element={
          <ProtectedRoute roles={['ADMIN', 'MANAGER']}>
            <AdminReportsPage />
          </ProtectedRoute>
        } />
        <Route path="admin/qr" element={
          <ProtectedRoute roles={['ADMIN', 'MANAGER']}>
            <AdminQRPage />
          </ProtectedRoute>
        } />
        <Route index element={<Navigate to="/tables" replace />} />
      </Route>

      <Route path="*" element={<Navigate to={user ? getDefaultRoute(user.role) : '/scan'} replace />} />
    </Routes>
  )
}

const getDefaultRoute = (role) => {
  if (role === 'KITCHEN') return '/kds'
  if (role === 'ADMIN') return '/admin/dashboard'
  if (role === 'MANAGER') return '/admin/dashboard'
  return '/tables' // CASHIER, WAITER
}

const App = () => (
  <AuthProvider>
    <BrowserRouter>
      <AppRoutes />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1f2937',
            color: '#f9fafb',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            fontSize: '14px',
          },
          success: {
            iconTheme: { primary: '#10b981', secondary: '#fff' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#fff' },
          },
        }}
      />
    </BrowserRouter>
  </AuthProvider>
)

export default App
