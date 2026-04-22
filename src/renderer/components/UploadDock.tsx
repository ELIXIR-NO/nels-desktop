import React, { useMemo, useState } from 'react'
import { CheckCircle2, ChevronDown, ChevronUp, Loader2, X, XCircle } from 'lucide-react'
import type { UploadItem } from '@shared/types'
import { useFs } from '../contexts/FsContext'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

function filename(path: string): string {
  const parts = path.split('/')
  return parts[parts.length - 1] || path
}

function StatusIcon({ status }: { status: UploadItem['status'] }) {
  switch (status) {
    case 'done':
      return <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-label="Done" />
    case 'error':
      return <XCircle className="h-4 w-4 text-destructive" aria-label="Failed" />
    case 'uploading':
      return <Loader2 className="h-4 w-4 animate-spin text-primary" aria-label="Uploading" />
    default:
      return <Loader2 className="h-4 w-4 text-muted-foreground" aria-label="Queued" />
  }
}

function Row({ item, onDismiss }: { item: UploadItem; onDismiss?: () => void }) {
  return (
    <li className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-5 py-2.5 hover:bg-muted/40">
      <StatusIcon status={item.status} />
      <div className="min-w-0">
        <div className="flex items-baseline justify-between gap-3">
          <span className="truncate text-sm font-medium">{filename(item.localPath) || '(unknown file)'}</span>
          <span
            className={cn(
              'shrink-0 text-xs tabular-nums',
              item.status === 'error' ? 'text-destructive'
                : item.status === 'done' ? 'text-emerald-600'
                : 'text-muted-foreground'
            )}
          >
            {item.status === 'error' ? 'Failed'
              : item.status === 'done' ? 'Done'
              : item.status === 'queued' ? 'Queued'
              : `${item.pct}%`}
          </span>
        </div>
        {item.status === 'uploading' || item.status === 'queued' ? (
          <Progress value={item.pct} className="mt-1.5 h-1" />
        ) : item.status === 'error' && item.error ? (
          <p className="mt-0.5 truncate text-xs text-destructive">{item.error}</p>
        ) : null}
      </div>
      {onDismiss ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground"
          onClick={onDismiss}
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      ) : (
        <div className="w-7" />
      )}
    </li>
  )
}

export function UploadDock() {
  const { uploads, dismissUpload } = useFs()
  const [collapsed, setCollapsed] = useState(false)

  const summary = useMemo(() => {
    let active = 0, done = 0, errors = 0
    for (const u of uploads) {
      if (u.status === 'uploading' || u.status === 'queued') active++
      else if (u.status === 'done') done++
      else if (u.status === 'error') errors++
    }
    return { active, done, errors }
  }, [uploads])

  if (uploads.length === 0) return null

  const label = summary.active > 0
    ? `Uploading ${summary.active} file${summary.active > 1 ? 's' : ''}`
    : summary.errors > 0
      ? `${summary.errors} failed, ${summary.done} done`
      : `${summary.done} completed`

  return (
    <div className="shrink-0 border-t bg-background shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.06)]">
      <button
        type="button"
        className="flex w-full items-center justify-between px-5 py-2.5 text-sm outline-none transition-colors hover:bg-muted/40 focus-visible:bg-muted/40"
        onClick={() => setCollapsed((c) => !c)}
        aria-expanded={!collapsed}
        aria-controls="upload-dock-list"
      >
        <div className="flex items-center gap-2.5">
          {summary.active > 0 && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
          <span className="font-medium">{label}</span>
          {summary.active > 0 && summary.done > 0 && (
            <span className="text-xs text-muted-foreground">· {summary.done} done</span>
          )}
        </div>
        {collapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {!collapsed && (
        <ul id="upload-dock-list" className="max-h-64 divide-y overflow-y-auto border-t">
          {uploads.map((item) => (
            <Row
              key={item.id}
              item={item}
              onDismiss={item.status === 'error' || item.status === 'done'
                ? () => dismissUpload(item.id)
                : undefined}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
