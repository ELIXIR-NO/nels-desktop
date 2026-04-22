import React from 'react'
import { Home, Folder, RefreshCw, Loader2, AlertCircle } from 'lucide-react'
import { useProjects } from '../contexts/ProjectsContext'
import { cn } from '@/lib/utils'

interface SidebarProps {
  currentPath: string
  onNavigate(path: string): void
}

// Returns the project name if the current path is rooted in a project, else null.
// Project paths start with `Projects/<name>/...` on the NeLS SFTP filesystem.
function projectRoot(path: string): string | null {
  const parts = path.split('/').filter(Boolean)
  if (parts[0] !== 'Projects' || !parts[1]) return null
  return parts[1]
}

export function Sidebar({ currentPath, onNavigate }: SidebarProps) {
  const { state, refresh } = useProjects()
  const active = projectRoot(currentPath)
  const atHome = active === null

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r bg-muted/30">
      <nav className="flex-1 overflow-y-auto p-2">
        <SidebarItem
          icon={<Home className="h-4 w-4" />}
          label="Personal"
          active={atHome}
          onClick={() => onNavigate('Personal')}
        />

        <div className="mb-1 mt-4 flex items-center justify-between px-2">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Projects
          </span>
          <button
            type="button"
            onClick={refresh}
            disabled={state.status === 'loading'}
            aria-label="Refresh projects"
            className="rounded-sm p-0.5 text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
          >
            {state.status === 'loading'
              ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
              : <RefreshCw className="h-3 w-3" aria-hidden />}
          </button>
        </div>

        {state.status === 'loading' && state.projects.length === 0 && (
          <div className="space-y-1 px-2 py-1">
            <div className="h-6 w-full animate-pulse rounded bg-muted" />
            <div className="h-6 w-3/4 animate-pulse rounded bg-muted" />
          </div>
        )}

        {state.status === 'error' && state.projects.length === 0 && (
          <div className="flex items-start gap-1.5 px-2 py-2 text-[11px] text-destructive">
            <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
            <span className="break-words">{state.error}</span>
          </div>
        )}

        {state.status === 'ready' && state.projects.length === 0 && (
          <p className="px-2 py-2 text-[11px] text-muted-foreground">
            No projects with filesystem access.
          </p>
        )}

        {state.projects.map((p) => (
          <SidebarItem
            key={p.projectId}
            icon={<Folder className="h-4 w-4" strokeWidth={1.75} />}
            label={p.name}
            title={p.role ? `${p.name} — ${p.role}` : p.name}
            active={active === p.name}
            onClick={() => onNavigate(`Projects/${p.name}`)}
          />
        ))}
      </nav>
    </aside>
  )
}

interface SidebarItemProps {
  icon: React.ReactNode
  label: string
  active: boolean
  onClick(): void
  title?: string
}

function SidebarItem({ icon, label, active, onClick, title }: SidebarItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none transition-colors',
        'focus-visible:ring-1 focus-visible:ring-ring',
        active
          ? 'bg-background font-medium text-foreground shadow-sm'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
      aria-current={active ? 'page' : undefined}
    >
      <span className={cn('shrink-0', active ? 'text-primary' : 'text-muted-foreground')}>
        {icon}
      </span>
      <span className="truncate">{label}</span>
    </button>
  )
}
