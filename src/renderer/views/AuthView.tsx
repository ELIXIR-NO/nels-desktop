import React, { useState } from 'react'
import { Loader2 } from 'lucide-react'
import nelsLogo from '@/assets/nels-logo.png'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'

export function AuthView() {
  const { status, error, loginWithToken } = useAuth()
  const [token, setToken] = useState('')

  const isConnecting = status === 'authenticating'
  const canSubmit = token.trim().length > 0 && !isConnecting

  const submit = () => {
    if (canSubmit) loginWithToken(token.trim())
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
            Paste an access token from the NeLS web UI to sign in
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Access token"
              disabled={isConnecting}
              aria-label="Access token"
              onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
            />
            <Button
              className="w-full"
              size="lg"
              onClick={submit}
              disabled={!canSubmit}
            >
              {isConnecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
              {isConnecting ? 'Connecting…' : 'Login'}
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Get a token from your profile on{' '}
            <span className="font-mono">nels.elixir.no</span>. Single sign-on is
            temporarily unavailable.
          </p>

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
