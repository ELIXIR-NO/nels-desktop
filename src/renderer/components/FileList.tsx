import React, { useMemo, useState } from 'react'
import { Folder, FileText, Inbox, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { FileEntry } from '@shared/types'
import { useFs } from '../contexts/FsContext'
import { cn } from '@/lib/utils'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

function formatSize(bytes: number, isDir: boolean): string {
  if (isDir) return '—'
  if (!bytes || bytes <= 0) return '—'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const v = bytes / Math.pow(1024, i)
  return `${v < 10 && i > 0 ? v.toFixed(1) : Math.round(v)} ${units[i]}`
}

function formatDate(d: Date): string {
  const date = new Date(d)
  const now = new Date()
  const sameYear = date.getFullYear() === now.getFullYear()
  return date.toLocaleDateString('en-GB', sameYear
    ? { month: 'short', day: 'numeric' }
    : { year: 'numeric', month: 'short', day: 'numeric' })
}

interface FileListProps {
  entries: FileEntry[]
  onNavigate(name: string): void
}

export function FileList({ entries, onNavigate }: FileListProps) {
  const { currentPath, deleteEntry } = useFs()
  const [target, setTarget] = useState<FileEntry | null>(null)
  const [deleting, setDeleting] = useState(false)

  const visible = useMemo(
    () => entries.filter((e) => !e.name.startsWith('.')),
    [entries]
  )

  async function confirmDelete() {
    if (!target) return
    setDeleting(true)
    const path = `${currentPath}/${target.name}`
    try {
      await deleteEntry(path, target.isDir)
      toast.success(`Deleted ${target.name}`)
      setTarget(null)
    } catch (err) {
      toast.error(`Could not delete ${target.name}`, {
        description: (err as Error).message,
      })
    } finally {
      setDeleting(false)
    }
  }

  if (visible.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-10">
        <div className="flex max-w-sm flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Inbox className="h-6 w-6 text-muted-foreground" aria-hidden />
          </div>
          <p className="text-sm font-medium">Nothing here yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Drop files anywhere in the window to upload them to this folder.
          </p>
        </div>
      </div>
    )
  }

  const folderCount = visible.filter((e) => e.isDir).length
  const fileCount = visible.length - folderCount

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between px-6 pb-2 pt-3 text-xs text-muted-foreground">
        <span>
          {folderCount > 0 && <>{folderCount} folder{folderCount > 1 ? 's' : ''}</>}
          {folderCount > 0 && fileCount > 0 && ' · '}
          {fileCount > 0 && <>{fileCount} file{fileCount > 1 ? 's' : ''}</>}
        </span>
      </div>

      <div className="flex-1 overflow-auto">
        <div
          role="rowgroup"
          className="sticky top-0 z-10 grid grid-cols-[minmax(0,1fr)_7rem_8rem_2.5rem] gap-4 border-b bg-background/95 px-6 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground backdrop-blur"
        >
          <div role="columnheader">Name</div>
          <div role="columnheader" className="text-right">Size</div>
          <div role="columnheader">Modified</div>
          <div role="columnheader" className="sr-only">Actions</div>
        </div>

        <ul role="list" className="divide-y divide-border/60">
          {visible.map((entry) => {
            const isDir = entry.isDir
            return (
              <li
                key={entry.name}
                role={isDir ? 'button' : undefined}
                aria-label={isDir ? entry.name : undefined}
                tabIndex={isDir ? 0 : undefined}
                onClick={isDir ? () => onNavigate(entry.name) : undefined}
                onKeyDown={(e) => {
                  if (isDir && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault()
                    onNavigate(entry.name)
                  }
                }}
                className={cn(
                  'group grid grid-cols-[minmax(0,1fr)_7rem_8rem_2.5rem] items-center gap-4 px-6 py-2 text-sm transition-colors',
                  isDir
                    ? 'cursor-pointer outline-none hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:ring-1 focus-visible:ring-ring'
                    : 'hover:bg-muted/30'
                )}
              >
                <div className="flex min-w-0 items-center gap-3">
                  {isDir ? (
                    <Folder
                      className="h-[18px] w-[18px] shrink-0 fill-sky-500/15 text-sky-500"
                      strokeWidth={1.75}
                      aria-hidden
                    />
                  ) : (
                    <FileText
                      className="h-[18px] w-[18px] shrink-0 text-muted-foreground"
                      strokeWidth={1.75}
                      aria-hidden
                    />
                  )}
                  <span className={cn('truncate', isDir && 'font-medium group-hover:text-foreground')}>
                    {entry.name}
                  </span>
                </div>
                <div className="text-right text-xs tabular-nums text-muted-foreground">
                  {formatSize(entry.size, isDir)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatDate(entry.mtime)}
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setTarget(entry)
                    }}
                    aria-label={`Delete ${entry.name}`}
                    title={`Delete ${entry.name}`}
                    className={cn(
                      'flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground outline-none transition-all',
                      'opacity-0 focus-visible:opacity-100 focus-visible:bg-muted group-hover:opacity-100',
                      'hover:bg-destructive/10 hover:text-destructive focus-visible:ring-1 focus-visible:ring-ring'
                    )}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      <AlertDialog open={target !== null} onOpenChange={(open) => !open && !deleting && setTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {target?.isDir ? 'folder' : 'file'} <span className="font-mono">{target?.name}</span>?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {target?.isDir
                ? 'This will permanently delete the folder and everything inside it.'
                : 'This will permanently delete the file.'}
              {' '}
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmDelete() }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive"
            >
              {deleting
                ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Deleting…</>
                : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
