import React from 'react'
import type { UserInfo } from '@shared/types'
import { FsProvider, useFs } from '../contexts/FsContext'
import { useAuth } from '../contexts/AuthContext'
import { Header } from '../components/Header'
import { Breadcrumb } from '../components/Breadcrumb'
import { FileList } from '../components/FileList'

function FileViewInner({ user }: { user: UserInfo }) {
  const { currentPath, entries, loading, navigate } = useFs()
  const { logout } = useAuth()

  function handleNavigate(name: string) {
    const newPath = currentPath ? `${currentPath}/${name}` : name
    navigate(newPath)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Header name={user.name} onLogout={logout} />
      <Breadcrumb path={currentPath} onNavigate={navigate} />
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <p style={{ padding: 20, color: '#999' }}>Loading…</p>
        ) : (
          <FileList entries={entries} onNavigate={handleNavigate} />
        )}
      </div>
    </div>
  )
}

export function FileView({ user }: { user: UserInfo }) {
  return (
    <FsProvider>
      <FileViewInner user={user} />
    </FsProvider>
  )
}
