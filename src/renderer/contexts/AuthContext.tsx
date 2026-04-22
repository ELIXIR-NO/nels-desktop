import React, { createContext, useContext, useEffect, useReducer } from 'react'
import type { UserInfo } from '@shared/types'

type AuthStatus = 'loading' | 'unauthenticated' | 'authenticating' | 'authenticated' | 'error'

interface AuthState {
  user: UserInfo | null
  status: AuthStatus
  error: string | null
}

type AuthAction =
  | { type: 'SESSION_CHECKED'; user: UserInfo | null }
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; user: UserInfo }
  | { type: 'LOGIN_ERROR'; error: string }
  | { type: 'LOGOUT' }

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SESSION_CHECKED':
      return { ...state, user: action.user, status: action.user ? 'authenticated' : 'unauthenticated' }
    case 'LOGIN_START':
      return { ...state, status: 'authenticating', error: null }
    case 'LOGIN_SUCCESS':
      return { user: action.user, status: 'authenticated', error: null }
    case 'LOGIN_ERROR':
      return { ...state, status: 'error', error: action.error }
    case 'LOGOUT':
      return { user: null, status: 'unauthenticated', error: null }
    default:
      return state
  }
}

interface AuthContextValue extends AuthState {
  login(): Promise<void>
  logout(): Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    status: 'loading',
    error: null,
  })

  useEffect(() => {
    window.nels.auth.getSession().then((user) => {
      dispatch({ type: 'SESSION_CHECKED', user })
    })
  }, [])

  async function login() {
    dispatch({ type: 'LOGIN_START' })
    try {
      const user = await window.nels.auth.login()
      dispatch({ type: 'LOGIN_SUCCESS', user })
    } catch (err) {
      dispatch({ type: 'LOGIN_ERROR', error: (err as Error).message })
    }
  }

  async function logout() {
    await window.nels.auth.logout()
    dispatch({ type: 'LOGOUT' })
  }

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
