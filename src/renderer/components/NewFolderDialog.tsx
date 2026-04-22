import React, { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useFs } from '../contexts/FsContext'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface NewFolderDialogProps {
  open: boolean
  onOpenChange(open: boolean): void
  parentPath: string
}

export function NewFolderDialog({ open, onOpenChange, parentPath }: NewFolderDialogProps) {
  const { createFolder } = useFs()
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset state when the dialog opens so stale input / errors don't linger.
  useEffect(() => {
    if (open) {
      setName('')
      setError(null)
      setSubmitting(false)
    }
  }, [open])

  async function submit() {
    if (submitting) return
    setError(null)
    setSubmitting(true)
    try {
      await createFolder(name)
      toast.success(`Created folder ${name.trim()}`)
      onOpenChange(false)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>New folder</DialogTitle>
          <DialogDescription>
            Creating inside <span className="font-mono text-foreground">{parentPath}</span>
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => { e.preventDefault(); submit() }}
          className="space-y-3"
        >
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Folder name"
            disabled={submitting}
          />
          {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !name.trim()}>
              {submitting
                ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Creating…</>
                : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
