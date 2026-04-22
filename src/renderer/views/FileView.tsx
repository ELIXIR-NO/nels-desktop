import React, { useRef, useState } from 'react'
import { Upload, Home, FolderKanban, RefreshCw } from 'lucide-react'
import type { UserInfo } from '@shared/types'
import { FsProvider, useFs } from '../contexts/FsContext'
import { useAuth } from '../contexts/AuthContext'
import { ProjectsProvider, useProjects } from '../contexts/ProjectsContext'
import { Header } from '../components/Header'
import { Sidebar } from '../components/Sidebar'
import { FileList } from '../components/FileList'
import { UploadDock } from '../components/UploadDock'
import { DragOverlay } from '../components/DragOverlay'
import { SettingsDialog } from '../components/SettingsDialog'
import { Button } from '@/components/ui/button'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface PathRoot {
  kind: 'home' | 'project'
  label: string
  path: string
  icon: React.ReactNode
}

interface ParsedPath {
  root: PathRoot
  segments: { label: string; path: string }[]
}

// SFTP paths are real filesystem paths under $HOME:
//   'Personal'                → NeLS personal storage
//   'Personal/foo'            → subfolder inside Personal
//   'Projects/<name>'         → project root
//   'Projects/<name>/foo/bar' → nested folder inside a project
// We never navigate to $HOME itself — writes there aren't NeLS-managed.
function parsePath(currentPath: string): ParsedPath {
  const parts = currentPath.split('/').filter(Boolean)
  if (parts[0] === 'Projects' && parts[1]) {
    const projectName = parts[1]
    const rest = parts.slice(2)
    return {
      root: {
        kind: 'project',
        label: projectName,
        path: `Projects/${projectName}`,
        icon: <FolderKanban className="h-3.5 w-3.5" aria-hidden />,
      },
      segments: rest.map((label, i) => ({
        label,
        path: ['Projects', projectName, ...rest.slice(0, i + 1)].join('/'),
      })),
    }
  }
  // Everything else (Personal, Personal/foo, ...) is rooted in Personal.
  const rest = parts[0] === 'Personal' ? parts.slice(1) : parts
  return {
    root: {
      kind: 'home',
      label: 'Personal',
      path: 'Personal',
      icon: <Home className="h-3.5 w-3.5" aria-hidden />,
    },
    segments: rest.map((label, i) => ({
      label,
      path: ['Personal', ...rest.slice(0, i + 1)].join('/'),
    })),
  }
}

function FileViewInner({ user }: { user: UserInfo }) {
  const { currentPath, entries, loading, error, navigate, queueUpload } = useFs()
  const { logout } = useAuth()
  const { refresh: refreshProjects, state: projectsState } = useProjects()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const { root, segments } = parsePath(currentPath)
  const atRoot = segments.length === 0
  const isRefreshing = loading || projectsState.status === 'loading'

  function handleNavigate(name: string) {
    const newPath = currentPath ? `${currentPath}/${name}` : name
    navigate(newPath)
  }

  function handlePickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files) return
    Array.from(files).forEach((file) => {
      let path = ''
      try { path = window.nels.getPathForFile(file) } catch { /* handled in queueUpload */ }
      queueUpload(path, file.name)
    })
    e.target.value = ''
  }

  function handleRefresh() {
    navigate(currentPath)
    refreshProjects()
  }

  return (
    <div className="flex h-full flex-col">
      <Header
        name={user.name}
        onLogout={logout}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <div className="flex min-h-0 flex-1">
        <Sidebar currentPath={currentPath} onNavigate={navigate} />

        <div className="flex min-w-0 flex-1 flex-col bg-muted/20">
          <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b bg-background px-5">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  {atRoot ? (
                    <BreadcrumbPage className="flex items-center gap-1.5">
                      {root.icon}
                      {root.label}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink
                      onClick={() => navigate(root.path)}
                      className="flex cursor-pointer items-center gap-1.5"
                    >
                      {root.icon}
                      {root.label}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {segments.map((seg, i) => {
                  const isLast = i === segments.length - 1
                  return (
                    <React.Fragment key={seg.path}>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        {isLast ? (
                          <BreadcrumbPage className="max-w-[200px] truncate">
                            {seg.label}
                          </BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink
                            onClick={() => navigate(seg.path)}
                            className="max-w-[200px] cursor-pointer truncate"
                          >
                            {seg.label}
                          </BreadcrumbLink>
                        )}
                      </BreadcrumbItem>
                    </React.Fragment>
                  )
                })}
              </BreadcrumbList>
            </Breadcrumb>

            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleRefresh}
                disabled={isRefreshing}
                title="Refresh"
                aria-label="Refresh"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
                  aria-hidden
                />
              </Button>
              <Button size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                Upload files
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handlePickFiles}
              />
            </div>
          </div>

          <main className="flex min-h-0 flex-1 flex-col">
            {loading ? (
              <div className="flex flex-1 items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
              </div>
            ) : error ? (
              <div className="p-5">
                <Alert variant="destructive">
                  <AlertTitle>Could not load folder</AlertTitle>
                  <AlertDescription className="mt-1 whitespace-pre-wrap break-words">{error}</AlertDescription>
                </Alert>
              </div>
            ) : (
              <FileList entries={entries} onNavigate={handleNavigate} />
            )}
          </main>

          <UploadDock />
        </div>
      </div>

      <DragOverlay />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} user={user} />
    </div>
  )
}

export function FileView({ user }: { user: UserInfo }) {
  return (
    <ProjectsProvider>
      <FsProvider>
        <FileViewInner user={user} />
      </FsProvider>
    </ProjectsProvider>
  )
}
