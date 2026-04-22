import React, { useEffect, useState } from 'react'
import { Check, Copy, CircleCheck, CircleX } from 'lucide-react'
import type { SafeConfig, SshCredentialInfo, UserInfo } from '@shared/types'
import { useProjects } from '../contexts/ProjectsContext'
import { useTheme } from '../contexts/ThemeContext'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

interface SettingsDialogProps {
  open: boolean
  onOpenChange(open: boolean): void
  user: UserInfo
}

export function SettingsDialog({ open, onOpenChange, user }: SettingsDialogProps) {
  const { state: projectsState } = useProjects()
  const { theme, resolved } = useTheme()

  const [config, setConfig] = useState<SafeConfig | null>(null)
  const [cred, setCred] = useState<SshCredentialInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    Promise.all([window.nels.config.get(), window.nels.auth.getCredentialInfo()])
      .then(([c, s]) => { setConfig(c); setCred(s) })
      .finally(() => setLoading(false))
  }, [open])

  function copyDiagnostics() {
    if (!config) return
    const report = [
      `NeLS Desktop — diagnostic report`,
      `Generated: ${new Date().toISOString()}`,
      ``,
      `# Account`,
      `Name:       ${user.name}`,
      `NeLS ID:    ${user.userId}`,
      ``,
      `# Environment`,
      `App version:   ${config.appVersion}`,
      `Packaged:      ${config.isPackaged}`,
      `API base:      ${config.apiBase}`,
      `OAuth base:    ${config.oauthBase}`,
      `Client ID:     ${config.clientId}`,
      `Redirect URI:  ${config.redirectUri}`,
      ``,
      `# SSH`,
      `Login host:    ${config.ssh.loginHost}`,
      `Data host:     ${config.ssh.dataHost}`,
      `Login fp:      ${config.ssh.loginFingerprint}`,
      `Data fp:       ${config.ssh.dataFingerprint}`,
      `SFTP user:     ${cred?.username ?? '(missing)'}`,
      `SFTP host:     ${cred?.host ?? '(missing)'}`,
      `Key in memory: ${cred?.hasKey ? 'yes' : 'no'}`,
      ``,
      `# Projects`,
      `Accessible:    ${projectsState.projects.length}`,
      `Status:        ${projectsState.status}`,
      ``,
      `# Appearance`,
      `Theme setting: ${theme}`,
      `Resolved:      ${resolved}`,
    ].join('\n')
    navigator.clipboard.writeText(report).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settings &amp; diagnostics</DialogTitle>
          <DialogDescription>
            Read-only view of the app's configuration and current session — useful when something looks off.
          </DialogDescription>
        </DialogHeader>

        {loading && !config ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : (
          <div className="space-y-5">
            <Section title="Account">
              <Row label="Name" value={user.name} />
              <Row label="NeLS ID" value={String(user.userId)} />
            </Section>

            <Section title="Environment">
              <Row label="App version" value={config?.appVersion ?? '—'} />
              <Row
                label="Build"
                value={config?.isPackaged ? 'Packaged' : 'Development'}
                badge={config?.isPackaged ? 'default' : 'dev'}
              />
              <Row label="API base" value={config?.apiBase ?? '—'} mono />
              <Row label="OAuth base" value={config?.oauthBase ?? '—'} mono />
              <Row label="OAuth client ID" value={config?.clientId ?? '—'} mono />
              <Row label="Redirect URI" value={config?.redirectUri ?? '—'} mono />
            </Section>

            <Section title="SSH session">
              <Row label="Login (bastion)" value={config?.ssh.loginHost ?? '—'} mono />
              <Row label="Data host (SFTP)" value={config?.ssh.dataHost ?? '—'} mono />
              <Row label="Login fingerprint" value={config?.ssh.loginFingerprint ?? '—'} mono truncate />
              <Row label="Data fingerprint" value={config?.ssh.dataFingerprint ?? '—'} mono truncate />
              <Row label="SFTP username" value={cred?.username ?? '(not connected)'} mono />
              <Row
                label="Key in keychain"
                value={cred?.hasKey ? 'Present' : 'Not present'}
                status={cred?.hasKey ? 'ok' : 'warn'}
              />
            </Section>

            <Section title="Projects">
              <Row
                label="Accessible"
                value={String(projectsState.projects.length)}
                status={projectsState.status === 'error' ? 'warn' : 'ok'}
              />
              <Row
                label="Load status"
                value={projectsState.status}
                status={
                  projectsState.status === 'ready' ? 'ok'
                    : projectsState.status === 'error' ? 'warn'
                    : 'neutral'
                }
              />
              {projectsState.projects.length > 0 && (
                <div className="mt-1 pl-0">
                  <ul className="space-y-0.5 text-xs text-muted-foreground">
                    {projectsState.projects.map((p) => (
                      <li key={p.projectId} className="flex justify-between gap-3">
                        <span className="truncate">{p.name}</span>
                        <span className="shrink-0 font-mono">{p.role ?? '—'}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Section>

            <Section title="Appearance">
              <Row label="Theme" value={theme} />
              <Row label="Resolved" value={resolved} />
            </Section>

            <Separator />

            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Copy a plain-text report to share when filing issues.
              </p>
              <Button variant="secondary" size="sm" onClick={copyDiagnostics} disabled={!config}>
                {copied
                  ? <><Check className="mr-1.5 h-3.5 w-3.5" /> Copied</>
                  : <><Copy className="mr-1.5 h-3.5 w-3.5" /> Copy report</>}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <dl className="space-y-1.5 rounded-md border bg-muted/20 px-3 py-2.5">
        {children}
      </dl>
    </section>
  )
}

interface RowProps {
  label: string
  value: string
  mono?: boolean
  truncate?: boolean
  status?: 'ok' | 'warn' | 'neutral'
  badge?: 'default' | 'dev'
}

function Row({ label, value, mono, truncate, status, badge }: RowProps) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          'min-w-0 text-right',
          mono && 'font-mono text-[13px]',
          truncate && 'truncate'
        )}
        title={truncate ? value : undefined}
      >
        <span className="inline-flex items-center gap-1.5">
          {status === 'ok' && <CircleCheck className="h-3.5 w-3.5 text-emerald-500" aria-hidden />}
          {status === 'warn' && <CircleX className="h-3.5 w-3.5 text-amber-500" aria-hidden />}
          {badge === 'dev' && (
            <span className="rounded-sm bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-600 dark:text-amber-400">
              dev
            </span>
          )}
          <span className={cn(truncate && 'truncate')}>{value}</span>
        </span>
      </dd>
    </div>
  )
}
