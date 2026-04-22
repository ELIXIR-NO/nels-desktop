import React from 'react'
import type { FileEntry } from '@shared/types'
import { FileRow } from './FileRow'

interface FileListProps {
  entries: FileEntry[]
  onNavigate(name: string): void
}

export function FileList({ entries, onNavigate }: FileListProps) {
  if (entries.length === 0) {
    return <p style={{ padding: '20px', color: '#999' }}>Empty directory</p>
  }

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
      <thead>
        <tr style={{ borderBottom: '1px solid #eee', textAlign: 'left' }}>
          <th style={{ padding: '8px 20px', fontWeight: 600 }}>Name</th>
          <th style={{ padding: '8px 20px', fontWeight: 600 }}>Size</th>
          <th style={{ padding: '8px 20px', fontWeight: 600 }}>Modified</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => (
          <FileRow key={entry.name} entry={entry} onNavigate={onNavigate} />
        ))}
      </tbody>
    </table>
  )
}
