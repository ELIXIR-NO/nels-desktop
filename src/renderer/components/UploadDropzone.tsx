import React, { useRef } from 'react'
import { useFs } from '../contexts/FsContext'

export function UploadDropzone() {
  const { queueUpload } = useFs()
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFiles(files: FileList | null) {
    if (!files) return
    Array.from(files).forEach((file) => {
      // Electron adds a `path` property to File objects from drag-drop and file inputs
      const path = (file as File & { path?: string }).path
      if (!path) return
      queueUpload(path, file.name)
    })
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    handleFiles(e.dataTransfer.files)
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      onClick={() => inputRef.current?.click()}
      style={{
        margin: '12px 20px',
        padding: '20px',
        border: '2px dashed #ccc',
        borderRadius: 8,
        textAlign: 'center',
        cursor: 'pointer',
        color: '#888',
        fontSize: 14,
        userSelect: 'none',
      }}
    >
      Drop files here or click to browse
      <input
        ref={inputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  )
}
