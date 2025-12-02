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

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 8)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  return (
    <>
      <header
        className={`sticky top-0 z-50 w-full border-b transition-all duration-300
        ${scrolled ? 'bg-white/90 backdrop-blur shadow-md' : 'bg-white'}
        `}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">

            {/* Logo & Brand */}
            <Link to="/admin" className="flex items-center gap-3 group">
              <div className="p-2 bg-orange-50 rounded-lg group-hover:bg-orange-100 transition-colors">
                <LayoutDashboard className="h-6 w-6 text-orange-600" />
              </div>
              <span className="hidden md:block text-lg font-semibold tracking-wide text-gray-900">
                AutoParts Admin
              </span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => {
                const active = isActive(item.path)
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`
                      relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
                      transition-all duration-200
                      ${
                        active
                          ? 'bg-orange-600 text-white shadow'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }
                    `}
                  >
                    <item.icon
                      className={`h-4 w-4 ${
                        active ? 'text-white' : 'text-gray-500'
                      }`}
                    />
                    {item.label}

                    {active && (
                      <span className="absolute left-1/2 -bottom-1 h-1 w-1/2 -translate-x-1/2 rounded-full bg-orange-500" />
                    )}
                  </Link>
                )
              })}
            </nav>

            {/* Right Side */}
            <div className="flex items-center gap-3">

              {/* Back To Store */}
              <button
                onClick={() => navigate('/')}
                className="hidden md:flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-700 hover:bg-orange-100 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Back to Store
              </button>

              {/* Mobile Toggle */}
              <button
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                className="lg:hidden inline-flex items-center justify-center rounded-lg p-2 hover:bg-gray-100 transition"
                aria-label="Toggle Menu"
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

        {/* Mobile Nav */}
        <div
          className={`
            lg:hidden overflow-hidden transition-all duration-300
            ${mobileMenuOpen ? 'max-h-screen border-t' : 'max-h-0'}
            border-gray-200 bg-white
          `}
        >
          <nav className="px-4 py-4 space-y-1">
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
                        ? 'bg-orange-50 text-orange-700'
                        : 'text-gray-700 hover:bg-gray-50'
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
    </>
  )
}
