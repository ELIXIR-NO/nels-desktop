import React from 'react'
import { TriangleAlert } from 'lucide-react'
import { env } from '@/lib/env'

export function EnvBanner() {
  if (!env.isStaging) return null
  return (
    <div
      role="status"
      className="flex shrink-0 items-center justify-center gap-2 border-b border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-300"
    >
      <TriangleAlert className="h-3.5 w-3.5" aria-hidden />
      <span>
        Staging build — uploads go to <code className="rounded-sm bg-amber-500/15 px-1 py-0.5 font-mono">{env.host}</code>
      </span>
    </div>
  )
}
