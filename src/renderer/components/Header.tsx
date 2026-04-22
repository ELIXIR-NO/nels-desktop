import React from 'react'

interface HeaderProps {
  name: string
  onLogout(): void
}

export function Header({ name, onLogout }: HeaderProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid #ddd' }}>
      <strong>NeLS</strong>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span>{name}</span>
        <button onClick={onLogout} style={{ fontSize: 13 }}>Logout</button>
      </div>
    </div>
  )
}
