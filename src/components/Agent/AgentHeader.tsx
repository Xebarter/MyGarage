import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'

interface AgentHeaderProps {
  agentName: string
}

const navLinks = [
  { name: 'Dashboard', path: '/agent/dashboard' },
  { name: 'Admins', path: '/agent/admins' },
  { name: 'Repair Shops', path: '/agent/repair-shops' },
  { name: 'Reports', path: '/agent/reports' },
]

const AgentHeader: React.FC<AgentHeaderProps> = ({ agentName }) => {
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  const getInitial = (name: string) => {
    return name?.charAt(0).toUpperCase() || 'A'
  }

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path)
  }

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 5)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header
      className={`sticky top-0 z-50 bg-white border-b transition-all duration-300 ${
        scrolled ? 'shadow-md' : ''
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* MAIN BAR */}
        <div className="flex justify-between items-center h-16">

          {/* BRAND */}
          <div className="flex items-center gap-8">
            <Link to="/agent/dashboard" className="text-lg font-bold text-gray-900 tracking-tight">
              MyGarage <span className="text-orange-600">Agent</span>
            </Link>

            {/* DESKTOP NAV */}
            <nav className="hidden lg:flex gap-6">
              {navLinks.map((link) => {
                const active = isActive(link.path)

                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`relative pb-1 text-sm font-medium transition ${
                      active
                        ? 'text-orange-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {link.name}
                    {active && (
                      <span className="absolute left-0 right-0 -bottom-1 h-0.5 bg-orange-600 rounded-full" />
                    )}
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* RIGHT SIDE */}
          <div className="flex items-center gap-4">

            {/* AGENT NAME */}
            <span className="hidden sm:inline-flex rounded-full bg-gray-100 px-4 py-1 text-sm font-medium text-gray-800 border">
              {agentName}
            </span>

            {/* AVATAR */}
            <div className="h-9 w-9 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-semibold">
              {getInitial(agentName)}
            </div>

            {/* MOBILE BUTTON */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="lg:hidden p-2 rounded-md hover:bg-gray-100"
            >
              {menuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* MOBILE MENU */}
        <div
          className={`lg:hidden transition-all duration-300 overflow-hidden ${
            menuOpen ? 'max-h-96 py-4' : 'max-h-0'
          }`}
        >
          <nav className="flex flex-col gap-3">
            {navLinks.map((link) => {
              const active = isActive(link.path)

              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMenuOpen(false)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                    active
                      ? 'bg-orange-100 text-orange-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {link.name}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>
    </header>
  )
}

export default AgentHeader
