import React, { Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './contexts/AuthContext'

const StaffLayout = React.lazy(() => import('./layouts/StaffLayout'))
const LoginPage = React.lazy(() => import('./pages/auth/LoginPage'))
const CustomerScanPage = React.lazy(() => import('./pages/customer/CustomerScanPage'))
const CustomerMenuPage = React.lazy(() => import('./pages/customer/CustomerMenuPage'))
const KDSPage = React.lazy(() => import('./pages/kds/KDSPage'))
const StaffTablesPage = React.lazy(() => import('./pages/staff/StaffTablesPage'))
const StaffTableDetailPage = React.lazy(() => import('./pages/staff/StaffTableDetailPage'))
const StaffRequestsPage = React.lazy(() => import('./pages/staff/StaffRequestsPage'))
const StaffInvoicePage = React.lazy(() => import('./pages/staff/StaffInvoicePage'))
const AdminDashboardPage = React.lazy(() => import('./pages/admin/AdminDashboardPage'))
const AdminUsersPage = React.lazy(() => import('./pages/admin/AdminUsersPage'))
const AdminTablesPage = React.lazy(() => import('./pages/admin/AdminTablesPage'))
const AdminMenuPage = React.lazy(() => import('./pages/admin/AdminMenuPage'))
const AdminReportsPage = React.lazy(() => import('./pages/admin/AdminReportsPage'))
const AdminQRPage = React.lazy(() => import('./pages/admin/AdminQRPage'))
const AdminSettingsPage = React.lazy(() => import('./pages/admin/AdminSettingsPage'))
const AdminEmailSendPage = React.lazy(() => import('./pages/admin/AdminEmailSendPage'))

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
    <Suspense fallback={<div className="min-h-screen bg-gray-50" aria-label="Đang tải trang" />}>
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
          <Route path="admin/email-send" element={
            <ProtectedRoute roles={['ADMIN']}>
              <AdminEmailSendPage />
            </ProtectedRoute>
          } />
          <Route path="admin/qr" element={
            <ProtectedRoute roles={['ADMIN', 'MANAGER']}>
              <AdminQRPage />
            </ProtectedRoute>
          } />
          <Route path="admin/settings" element={
            <ProtectedRoute roles={['ADMIN']}>
              <AdminSettingsPage />
            </ProtectedRoute>
          } />
          <Route index element={<Navigate to="/tables" replace />} />
        </Route>

        <Route path="/invoices/:id" element={
          <ProtectedRoute roles={['ADMIN', 'MANAGER', 'CASHIER', 'WAITER']}>
            <StaffInvoicePage />
          </ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to={user ? getDefaultRoute(user.role) : '/scan'} replace />} />
      </Routes>
    </Suspense>
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
