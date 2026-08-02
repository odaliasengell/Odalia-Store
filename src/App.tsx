import { Suspense, lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Login } from '@/routes/Login'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AppShell } from '@/components/layout/AppShell'

const Dashboard = lazy(() => import('@/routes/Dashboard').then((m) => ({ default: m.Dashboard })))
const Ventas = lazy(() => import('@/routes/Ventas').then((m) => ({ default: m.Ventas })))
const Clientes = lazy(() => import('@/routes/Clientes').then((m) => ({ default: m.Clientes })))
const Gastos = lazy(() => import('@/routes/Gastos').then((m) => ({ default: m.Gastos })))
const Entregas = lazy(() => import('@/routes/Entregas').then((m) => ({ default: m.Entregas })))
const Ruleta = lazy(() => import('@/routes/Ruleta').then((m) => ({ default: m.Ruleta })))

function RouteFallback() {
  return <p className="p-8 text-sm text-muted-foreground">Cargando…</p>
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppShell>
              <Suspense fallback={<RouteFallback />}>
                <Dashboard />
              </Suspense>
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/ventas"
        element={
          <ProtectedRoute>
            <AppShell>
              <Suspense fallback={<RouteFallback />}>
                <Ventas />
              </Suspense>
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/clientes"
        element={
          <ProtectedRoute>
            <AppShell>
              <Suspense fallback={<RouteFallback />}>
                <Clientes />
              </Suspense>
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/gastos"
        element={
          <ProtectedRoute>
            <AppShell>
              <Suspense fallback={<RouteFallback />}>
                <Gastos />
              </Suspense>
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/entregas"
        element={
          <ProtectedRoute>
            <AppShell>
              <Suspense fallback={<RouteFallback />}>
                <Entregas />
              </Suspense>
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/ruleta"
        element={
          <ProtectedRoute>
            <AppShell>
              <Suspense fallback={<RouteFallback />}>
                <Ruleta />
              </Suspense>
            </AppShell>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default App
