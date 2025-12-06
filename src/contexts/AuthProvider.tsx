import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

type AuthContextType = {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<any>
  signUp: (email: string, password: string) => Promise<any>
  signOut: () => Promise<any>
  signInWithProvider: (provider: string) => Promise<any>
  signInWithMagicLink: (email: string) => Promise<any>
  resetPassword: (email: string) => Promise<any>
  // role flags
  isAdmin: boolean
  isSuperAdmin: boolean
  isAgent: boolean
  isMechanic: boolean
  isPublicUser: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [isAgent, setIsAgent] = useState(false)
  const [isMechanic, setIsMechanic] = useState(false)
  const [isPublicUser, setIsPublicUser] = useState(false)

  useEffect(() => {
    let mounted = true

    async function init() {
      try {
        const { data } = await supabase.auth.getSession()
        if (!mounted) return
        const u = data.session?.user ?? null
        setUser(u)
        if (u) {
          await ensureUserProfile(u)
          await loadRoles(u)
        }
      } catch (err) {
        console.error('Error getting initial session', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    init()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) {
        ensureUserProfile(u)
          .then(() => loadRoles(u))
          .catch((e) => console.error('Error ensuring user profile or loading roles', e))
      }
    })

    return () => {
      mounted = false
      if (listener?.subscription) listener.subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    return supabase.auth.signInWithPassword({ email, password })
  }

  const signInWithMagicLink = async (email: string) => {
    return supabase.auth.signInWithOtp({ email })
  }

  const signUp = async (email: string, password: string) => {
    return supabase.auth.signUp({ email, password })
  }

  const signOut = async () => {
    return supabase.auth.signOut()
  }

  const signInWithProvider = async (provider: string) => {
    return supabase.auth.signInWithOAuth({ provider })
  }

  const resetPassword = async (email: string) => {
    // Sends a password reset email via Supabase
    // supabase v2 provides resetPasswordForEmail
    // Fallback to signInWithOtp for recovery if not available
    // @ts-ignore
    if ((supabase.auth as any).resetPasswordForEmail) {
      // @ts-ignore
      return (supabase.auth as any).resetPasswordForEmail(email)
    }
    return supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } })
  }

  async function ensureUserProfile(u: User) {
    try {
      // Check if public_users record exists
      const { data, error } = await supabase
        .from('public_users')
        .select('id')
        .eq('auth_id', u.id)
        .maybeSingle()

      // If no error and no data, create a new public_users record
      if (!error && !data) {
        await supabase.from('public_users').insert({
          auth_id: u.id,
          email: u.email,
          full_name: u.user_metadata?.full_name || '',
          account_status: 'active',
        })
      }
    } catch (err) {
      console.error('Error ensuring user profile', err)
    }
  }

  async function loadRoles(u: User) {
    try {
      // reset
      setIsAdmin(false)
      setIsSuperAdmin(false)
      setIsAgent(false)
      setIsMechanic(false)
      setIsPublicUser(false)

      // Check admins table by auth id
      const adminRes = await supabase.from('admins').select('role').eq('id', u.id).maybeSingle()
      if (!adminRes.error && adminRes.data) {
        const role = (adminRes.data as any).role
        setIsAdmin(true)
        if (role === 'super_admin') setIsSuperAdmin(true)
      }

      // Check agents table if it exists (by auth id)
      try {
        const agentRes = await supabase.from('agents').select('id').eq('id', u.id).maybeSingle()
        if (!agentRes.error && agentRes.data) setIsAgent(true)
      } catch {
        // agents table may not exist yet
      }

      // Check mechanics by auth_id
      try {
        const mechRes = await supabase.from('mechanics').select('id').eq('auth_id', u.id).maybeSingle()
        if (!mechRes.error && mechRes.data) setIsMechanic(true)
      } catch {
        // mechanics table may not exist yet or auth_id not set
      }

      // Check public user profile by auth_id
      const publicUser = await supabase.from('public_users').select('id').eq('auth_id', u.id).maybeSingle()
      if (!publicUser.error && publicUser.data) setIsPublicUser(true)
    } catch (err) {
      console.error('Error loading role flags', err)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        signOut,
        signInWithProvider,
        signInWithMagicLink,
        resetPassword,
        isAdmin,
        isSuperAdmin,
        isAgent,
        isMechanic,
        isPublicUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export default AuthContext
