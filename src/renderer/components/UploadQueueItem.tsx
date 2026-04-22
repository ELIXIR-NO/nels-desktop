import React from 'react'
import type { UploadItem } from '@shared/types'

interface UploadQueueItemProps {
  item: UploadItem
  onDismiss?: () => void
}

export function UploadQueueItem({ item, onDismiss }: UploadQueueItemProps) {
  const filename = item.localPath.split('/').pop() ?? item.localPath
  const statusColor = item.status === 'error' ? 'red' : item.status === 'done' ? '#090' : '#333'

  return (
    <div style={{ padding: '8px 20px', borderTop: '1px solid #f0f0f0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
        <span style={{ color: '#333' }}>{filename}</span>
        <span style={{ color: statusColor }}>
          {item.status === 'error' ? (
            <>
              {`Error: ${item.error}`}
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#666', fontSize: 11 }}
                >
                  ✕
                </button>
              )}
            </>
          ) : item.status === 'done' ? 'Done' : `${item.pct}%`}
        </span>
      </div>
      {item.status !== 'done' && item.status !== 'error' && (
        <div style={{ background: '#eee', borderRadius: 4, height: 6 }}>
          <div style={{ background: '#0066cc', borderRadius: 4, height: 6, width: `${item.pct}%`, transition: 'width 0.2s' }} />
        </div>
      )}
    </div>
  )
}
