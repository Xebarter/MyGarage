import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  ListOrdered,
  Calendar,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { useState, useEffect } from 'react'

interface NavItem {
  path: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const navItems: NavItem[] = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/admin/products', label: 'Products', icon: Package },
  { path: '/admin/orders', label: 'Orders', icon: ListOrdered },
  { path: '/admin/appointments', label: 'Appointments', icon: Calendar },
  { path: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { path: '/admin/settings', label: 'Settings', icon: Settings },
]

export function AdminHeader() {
  const location = useLocation()
  const navigate = useNavigate()

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  // Handle scroll styling
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 6)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Auto close mobile menu on resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024 && mobileMenuOpen) {
        setMobileMenuOpen(false)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [mobileMenuOpen])

  const isActive = (path: string) => {
    if (path === '/admin') {
      return location.pathname === '/admin'
    }
    return location.pathname.startsWith(path)
  }

  return (
    <header
      className={`
        sticky top-0 z-50 w-full border-b bg-white transition-all duration-300
        ${scrolled ? 'shadow-md bg-white/90 backdrop-blur-lg' : ''}
      `}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">

          {/* Logo */}
          <Link
            to="/admin"
            className="flex items-center gap-3 font-semibold text-gray-900"
          >
            <div className="rounded-xl bg-orange-100 p-2">
              <LayoutDashboard className="h-6 w-6 text-orange-600" />
            </div>

            <span className="hidden md:block text-lg tracking-tight">
              AutoParts Admin
            </span>
          </Link>

          {/* Desktop Menu */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const active = isActive(item.path)

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`
                    group relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition
                    ${
                      active
                        ? 'bg-orange-600 text-white shadow'
                        : 'text-gray-700 hover:bg-gray-100'
                    }
                  `}
                >
                  <item.icon
                    className={`h-4 w-4 transition ${
                      active ? 'text-white' : 'text-gray-500 group-hover:text-gray-700'
                    }`}
                  />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2">

            {/* Back to Store */}
            <button
              onClick={() => navigate('/')}
              className="hidden md:inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-700 hover:bg-orange-100 transition"
            >
              <LogOut className="h-4 w-4" />
              Back to Store
            </button>

            {/* Mobile Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
              className="lg:hidden inline-flex items-center justify-center rounded-lg p-2 hover:bg-gray-100 transition"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6 text-gray-700" />
              ) : (
                <Menu className="h-6 w-6 text-gray-700" />
              )}
            </button>

          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`
          lg:hidden overflow-hidden transition-all duration-300 ease-in-out
          ${mobileMenuOpen ? 'max-h-[500px] border-t' : 'max-h-0'}
        `}
      >
        <nav className="space-y-2 px-4 py-4 bg-white">
          {navItems.map((item) => {
            const active = isActive(item.path)

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`
                  flex items-center gap-3 rounded-xl px-4 py-3 text-base font-medium transition
                  ${
                    active
                      ? 'bg-orange-100 text-orange-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }
                `}
              >
                <item.icon
                  className={`h-5 w-5 ${
                    active ? 'text-orange-600' : 'text-gray-500'
                  }`}
                />
                {item.label}
              </Link>
            )
          })}

          <button
            onClick={() => {
              navigate('/')
              setMobileMenuOpen(false)
            }}
            className="flex w-full items-center gap-3 rounded-xl bg-orange-50 px-4 py-3 text-base font-medium text-orange-700 hover:bg-orange-100 transition"
          >
            <LogOut className="h-5 w-5" />
            Back to Store
          </button>
        </nav>
      </div>
    </header>
  )
}
