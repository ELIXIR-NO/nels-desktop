import React from 'react'
import { DEFAULT_PATH } from '../contexts/FsContext'

interface BreadcrumbProps {
  path: string
  onNavigate(path: string): void
}

export function Breadcrumb({ path, onNavigate }: BreadcrumbProps) {
  const parts = path.split('/').filter(Boolean)

  return (
    <div style={{ padding: '8px 20px', fontSize: 13, color: '#555' }}>
      <button
        onClick={() => onNavigate(DEFAULT_PATH)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', padding: 0 }}
      >
        Home
      </button>
      {parts.map((part, i) => {
        const partPath = parts.slice(0, i + 1).join('/')
        return (
          <React.Fragment key={partPath}>
            {' / '}
            <button
              onClick={() => onNavigate(partPath)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: i === parts.length - 1 ? '#000' : '#555', padding: 0, fontWeight: i === parts.length - 1 ? 600 : 400 }}
            >
              {part}
            </button>
          </React.Fragment>
        )
      })}
    </div>
  )
}
