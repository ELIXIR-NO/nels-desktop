import React, { useState } from 'react'
import { Loader2, TriangleAlert } from 'lucide-react'
import nelsLogo from '@/assets/nels-logo.png'
import { useAuth } from '../contexts/AuthContext'
import { env } from '@/lib/env'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'

export function AuthView() {
  const { status, error, login, loginWithToken } = useAuth()
  const [token, setToken] = useState('')

  const isConnecting = status === 'authenticating'
  const canSubmitToken = token.trim().length > 0 && !isConnecting

  const submitToken = () => {
    if (canSubmitToken) loginWithToken(token.trim())
  }

  return (
    <div className="flex h-full items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-md shadow-sm">
        <CardHeader className="items-center pb-4 pt-8 text-center">
          <img
            src={nelsLogo}
            alt="NeLS"
            className="mb-4 h-10 w-auto select-none"
            draggable={false}
          />
          <CardDescription className="text-[15px]">
            Sign in to upload files to your personal storage or projects
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Button
            className="w-full"
            size="lg"
            onClick={login}
            disabled={isConnecting}
          >
            {isConnecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
            {isConnecting ? 'Connecting…' : 'Sign in with Feide'}
          </Button>

          <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200">
            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>
              Feide single sign-on is currently unreliable while the OAuth
              implicit-grant flow is being stabilised.
              {env.isStaging && <> If it doesn't come back, paste an access token below.</>}
            </span>
          </div>

          {env.isStaging && (
            <>
              <div className="flex items-center gap-2">
                <Separator className="flex-1" />
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Or paste a token
                </span>
                <Separator className="flex-1" />
              </div>

              <div className="space-y-2">
                <Input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder={`Token from ${env.host}`}
                  disabled={isConnecting}
                  aria-label="Access token"
                  onKeyDown={(e) => { if (e.key === 'Enter') submitToken() }}
                />
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={submitToken}
                  disabled={!canSubmitToken}
                >
                  Sign in with token
                </Button>
              </div>
            </>
          )}

          {error && (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
