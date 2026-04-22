import React from 'react'
import { useAuth } from '../contexts/AuthContext'

export function AuthView() {
  const { status, error, login } = useAuth()

  const isConnecting = status === 'authenticating'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 16 }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, margin: 0 }}>NeLS</h1>
      <p style={{ color: '#666', margin: 0 }}>Personal storage</p>
      <button
        onClick={login}
        disabled={isConnecting}
        style={{ marginTop: 24, padding: '10px 28px', fontSize: 16, cursor: isConnecting ? 'not-allowed' : 'pointer' }}
      >
        {isConnecting ? 'Connecting…' : 'Login with Feide'}
      </button>
      {error && (
        <p role="alert" style={{ color: 'red', maxWidth: 340, textAlign: 'center' }}>
          {error}
        </p>
      )}
    </div>
  )
}
