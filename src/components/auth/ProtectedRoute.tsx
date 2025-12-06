import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthProvider'

type AllowedRole = 'admin' | 'super_admin' | 'agent' | 'mechanic' | 'user'

export function ProtectedRoute({ children, allowedRoles }: { children: React.ReactElement; allowedRoles: AllowedRole[] }) {
  const { user, loading, isAdmin, isSuperAdmin, isAgent, isMechanic, isPublicUser } = useAuth()

  if (loading) return null

  if (!user) {
    return <Navigate to="/login" replace />
  }

  const hasAccess = (() => {
    if (allowedRoles.includes('super_admin') && isSuperAdmin) return true
    if ((allowedRoles.includes('admin') || allowedRoles.includes('super_admin')) && isAdmin) return true
    if (allowedRoles.includes('agent') && isAgent) return true
    if (allowedRoles.includes('mechanic') && isMechanic) return true
    if (allowedRoles.includes('user') && isPublicUser) return true
    return false
  })()

  if (!hasAccess) {
    return <Navigate to="/login" replace />
  }

  return children
}