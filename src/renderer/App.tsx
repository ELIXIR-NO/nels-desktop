import React from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthView } from './views/AuthView'
import { FileView } from './views/FileView'
import { Toaster } from '@/components/ui/sonner'

function AppInner() {
  const { status, user } = useAuth()

  if (status === 'loading') {
    return (
      <div className="flex h-full items-center justify-center bg-muted/30">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
      </div>
    )
  }

  if (status === 'authenticated') {
    if (!user) return null
    return <FileView user={user} />
  }

  return <AuthView />
}

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppInner />
        <Toaster position="bottom-right" richColors closeButton />
      </AuthProvider>
    </ThemeProvider>
  )
}
