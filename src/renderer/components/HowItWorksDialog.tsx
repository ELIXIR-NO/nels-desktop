import React from 'react'
import { KeyRound, Link2, ShieldCheck, ArrowUpDown, Lock } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface HowItWorksDialogProps {
  open: boolean
  onOpenChange(open: boolean): void
}

export function HowItWorksDialog({ open, onOpenChange }: HowItWorksDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>How NeLS Desktop works</DialogTitle>
          <DialogDescription>
            A quick look at the plumbing between your machine and NeLS storage.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <Step
            icon={<KeyRound className="h-4 w-4" aria-hidden />}
            title="Signing in"
          >
            You paste an access token from the NeLS web UI. The app validates it
            against the NeLS REST API (<code className="font-mono text-[13px]">/my-account</code>)
            and then requests an SSH credential
            (<code className="font-mono text-[13px]">/users/&#123;id&#125;/do</code>), which
            returns a short-lived private key. The token and the private key are
            stored in your OS keychain — GNOME Keyring on Linux, Keychain on
            macOS, Credential Manager on Windows. Neither ever touches disk as a
            plain file.
          </Step>

          <Step
            icon={<Link2 className="h-4 w-4" aria-hidden />}
            title="Connecting"
          >
            Storage sits behind a bastion. The app opens an SSH connection to
            the bastion (<code className="font-mono text-[13px]">login.nels.elixir.no</code>),
            then forwards a TCP channel through it to the data host
            (<code className="font-mono text-[13px]">data.nels.elixir.no</code>), and
            opens a second SSH session over that channel. This is the same
            <code className="font-mono text-[13px]"> ProxyJump</code> pattern you'd
            write in <code className="font-mono text-[13px]">~/.ssh/config</code> — done
            in process, no <code className="font-mono text-[13px]">ssh</code> binary
            required. The SSH library is <code className="font-mono text-[13px]">ssh2</code>
            {' '}(pure JavaScript, no native binaries).
          </Step>

          <Step
            icon={<ShieldCheck className="h-4 w-4" aria-hidden />}
            title="Verifying the server"
          >
            Both SSH hops check the server's host key against a pinned SHA-256
            fingerprint bundled with the app. If the server presents a different
            key — because the host rotated, DNS is redirected, or someone is
            attempting a man-in-the-middle — the handshake fails and no data is
            sent. You can see both pinned fingerprints in{' '}
            <strong>Settings → SSH session</strong>.
          </Step>

          <Step
            icon={<ArrowUpDown className="h-4 w-4" aria-hidden />}
            title="Moving files"
          >
            Once connected, the app opens the <strong>SFTP subsystem</strong> over
            the SSH tunnel — not raw SSH, not SCP. Uploads use{' '}
            <code className="font-mono text-[13px]">fastPut</code>, which pipelines
            many write requests at once so throughput stays close to your
            network limit. Listings use <code className="font-mono text-[13px]">readdir</code>,
            folder creation uses <code className="font-mono text-[13px]">mkdir</code>,
            and deletion walks the tree bottom-up with{' '}
            <code className="font-mono text-[13px]">unlink</code> + <code className="font-mono text-[13px]">rmdir</code>
            {' '}(SFTP has no single recursive-delete operation).
          </Step>

          <Step
            icon={<Lock className="h-4 w-4" aria-hidden />}
            title="Security model"
          >
            All of this happens in the app's <strong>main process</strong>. The UI
            runs in a <strong>sandboxed renderer</strong> with no direct access to
            Node, the filesystem, or SSH — it speaks to the main process only
            through a narrow, typed IPC surface. The private key never reaches
            the renderer, so a compromised page or dependency can't exfiltrate
            it. Dangerous operations like delete are guarded server-side: the
            IPC handler refuses any path outside <code className="font-mono text-[13px]">Personal/</code>
            {' '}or <code className="font-mono text-[13px]">Projects/&lt;name&gt;/</code>.
          </Step>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface StepProps {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}

function Step({ icon, title, children }: StepProps) {
  return (
    <section className="flex gap-3">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border bg-muted/40 text-muted-foreground">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="mb-1 text-sm font-semibold">{title}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground [&_code]:rounded-sm [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_strong]:font-medium [&_strong]:text-foreground">
          {children}
        </p>
      </div>
    </section>
  )
}
