import React from 'react'
import type { FileEntry } from '@shared/types'

function formatSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '—'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' })
}

interface FileRowProps {
  entry: FileEntry
  onNavigate(name: string): void
}

export function FileRow({ entry, onNavigate }: FileRowProps) {
  return (
    <tr>
      <td style={{ padding: '6px 20px' }}>
        {entry.isDir ? (
          <button
            onClick={() => onNavigate(entry.name)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0066cc', padding: 0, fontWeight: 500 }}
          >
            📁 <span>{entry.name}</span>
          </button>
        ) : (
          <span>📄 <span>{entry.name}</span></span>
        )}
      </td>
      <td style={{ padding: '6px 20px', color: '#666', fontSize: 13 }}>{formatSize(entry.size)}</td>
      <td style={{ padding: '6px 20px', color: '#666', fontSize: 13 }}>{formatDate(entry.mtime)}</td>
    </tr>
  )
}
