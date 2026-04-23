import React from 'react'
import { TriangleAlert } from 'lucide-react'

// Detect the build target from the renderer's baked-in env. Defaults match
// src/main/config.ts — staging is the dev default. CI injects VITE_API_BASE
// to production for non-staging tag builds.
const apiBase = import.meta.env.VITE_API_BASE ?? 'https://staging.nels.elixir.no/nels-api2'
const host = (() => { try { return new URL(apiBase).host } catch { return apiBase } })()
const isStaging = host.startsWith('staging.') || host.includes('.staging.')

export function EnvBanner() {
  if (!isStaging) return null
  return (
    <div
      role="status"
      className="flex shrink-0 items-center justify-center gap-2 border-b border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-300"
    >
      <TriangleAlert className="h-3.5 w-3.5" aria-hidden />
      <span>
        Staging build — uploads go to <code className="rounded-sm bg-amber-500/15 px-1 py-0.5 font-mono">{host}</code>
      </span>
    </div>
  )
}
