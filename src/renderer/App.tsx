import React from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { AuthView } from './views/AuthView'
import { FileView } from './views/FileView'

function AppInner() {
  const { status, user } = useAuth()

  if (status === 'loading') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#999' }}>
        Loading…
      </div>
    )
  }

  if (status === 'authenticated') {
    if (!user) return null  // Impossible: authenticated state always has a user.
    return <FileView user={user} />
  }

  return <AuthView />
}

export function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  )
}
