import React, { useEffect, useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { useFs } from '../contexts/FsContext'

// Full-window drag overlay. Mounted once inside FsProvider. Listens on the
// window so a drop anywhere in the app triggers an upload to the current
// directory. dragenter/dragleave fire for every child element entered, so we
// keep a counter to know when the cursor has truly left the window.
export function DragOverlay() {
  const { currentPath, queueUpload } = useFs()
  const [isDragging, setIsDragging] = useState(false)
  const dragCounter = useRef(0)

  useEffect(() => {
    function isFileDrag(e: DragEvent): boolean {
      return !!e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files')
    }

    function onDragEnter(e: DragEvent) {
      if (!isFileDrag(e)) return
      e.preventDefault()
      dragCounter.current += 1
      setIsDragging(true)
    }

    function onDragLeave(e: DragEvent) {
      if (!isFileDrag(e)) return
      e.preventDefault()
      dragCounter.current -= 1
      if (dragCounter.current <= 0) {
        dragCounter.current = 0
        setIsDragging(false)
      }
    }

    function onDragOver(e: DragEvent) {
      if (!isFileDrag(e)) return
      e.preventDefault()
    }

    function onDrop(e: DragEvent) {
      e.preventDefault()
      dragCounter.current = 0
      setIsDragging(false)
      const files = e.dataTransfer?.files
      if (!files || files.length === 0) return
      Array.from(files).forEach((file) => {
        let path = ''
        try {
          path = window.nels.getPathForFile(file)
        } catch {
          // queueUpload surfaces the empty-path case as an error item.
        }
        queueUpload(path, file.name)
      })
    }

    window.addEventListener('dragenter', onDragEnter)
    window.addEventListener('dragleave', onDragLeave)
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragenter', onDragEnter)
      window.removeEventListener('dragleave', onDragLeave)
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('drop', onDrop)
    }
  }, [queueUpload])

  if (!isDragging) return null

  return (
    <div
      role="presentation"
      className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-background/75 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div className="flex flex-col items-center rounded-xl border-2 border-dashed border-primary/40 bg-background px-12 py-10 shadow-xl">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Upload className="h-6 w-6" aria-hidden />
        </div>
        <p className="text-lg font-semibold">Drop to upload</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Uploading to <span className="font-medium text-foreground">{currentPath || 'Home'}</span>
        </p>
      </div>
    </div>
  )
}
