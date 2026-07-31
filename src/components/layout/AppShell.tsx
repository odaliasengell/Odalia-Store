import { type ReactNode, useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  Receipt,
  PackageCheck,
  Menu,
  X,
  Sparkles,
  ChevronsUpDown,
  Sun,
  Moon,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useProfile } from '@/hooks/useProfile'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ProfileDialog } from '@/components/ProfileDialog'
import { TodayDeliveriesBanner } from '@/components/deliveries/TodayDeliveriesBanner'
import { getInitials } from '@/lib/format'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/', label: 'Estadísticas', icon: LayoutDashboard, end: true },
  { to: '/ventas', label: 'Ventas', icon: ShoppingBag },
  { to: '/clientes', label: 'Clientes', icon: Users },
  { to: '/gastos', label: 'Gastos', icon: Receipt },
  { to: '/entregas', label: 'Entregas', icon: PackageCheck },
]

function UserMenuButton({ onClick }: { onClick: () => void }) {
  const { user } = useAuth()
  const { data: profile } = useProfile()
  const displayName = profile?.full_name || user?.email?.split('@')[0] || ''

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition-colors hover:bg-sidebar-accent"
    >
      <Avatar size="sm">
        <AvatarFallback className="bg-brand-pink-strong text-white">
          {getInitials(displayName)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium leading-tight">{displayName}</p>
        <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
      </div>
      <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
    </button>
  )
}

function ThemeToggleButton() {
  const { theme, toggleTheme } = useTheme()
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
    >
      {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  const navLinks = (
    <nav className="flex flex-1 flex-col gap-1 px-3">
      {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={() => setMobileOpen(false)}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-brand-pink-strong text-white shadow-sm'
                : 'text-sidebar-foreground hover:bg-sidebar-accent',
            )
          }
        >
          <Icon className="size-4" />
          {label}
        </NavLink>
      ))}
    </nav>
  )

  return (
    <div className="flex min-h-svh bg-background">
      {/* Sidebar desktop */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <div className="flex items-center gap-2 px-5 py-5">
          <span className="flex size-9 items-center justify-center rounded-full bg-brand-pink-strong text-white">
            <Sparkles className="size-4" />
          </span>
          <div className="flex-1">
            <p className="font-heading text-sm font-semibold leading-tight">Odalia Store</p>
            <p className="text-xs text-muted-foreground">Panel de ventas</p>
          </div>
          <ThemeToggleButton />
        </div>
        {navLinks}
        <div className="mt-auto border-t border-sidebar-border p-3">
          <UserMenuButton onClick={() => setProfileOpen(true)} />
        </div>
      </aside>

      {/* Mobile topbar */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 md:hidden">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-full bg-brand-pink-strong text-white">
              <Sparkles className="size-4" />
            </span>
            <p className="font-heading text-sm font-semibold">Odalia Store</p>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggleButton />
            <Button variant="ghost" size="icon" onClick={() => setMobileOpen((v) => !v)}>
              {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </Button>
          </div>
        </header>

        {mobileOpen && (
          <div className="flex flex-col gap-2 border-b border-border bg-sidebar py-3 md:hidden">
            {navLinks}
            <div className="px-3">
              <UserMenuButton
                onClick={() => {
                  setMobileOpen(false)
                  setProfileOpen(true)
                }}
              />
            </div>
          </div>
        )}

        <main className="min-w-0 flex-1 overflow-y-auto bg-background p-4 md:p-8">
          <div className="mx-auto w-full min-w-0 max-w-6xl">
            <TodayDeliveriesBanner />
            {children}
          </div>
        </main>
      </div>

      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
    </div>
  )
}
