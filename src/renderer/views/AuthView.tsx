import React, { useState } from 'react'
import { Loader2 } from 'lucide-react'
import nelsLogo from '@/assets/nels-logo.png'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'

export function AuthView() {
  const { status, error, login, loginWithToken } = useAuth()
  const [devToken, setDevToken] = useState('')

  const isConnecting = status === 'authenticating'

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
            {isConnecting ? 'Connecting…' : 'Login with Feide'}
          </Button>

          {error && (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>

        <CardFooter className="flex-col space-y-3 border-t bg-muted/20 pt-4">
          <div className="flex w-full items-center gap-2">
            <Separator className="flex-1" />
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Or sign in with a token
            </span>
            <Separator className="flex-1" />
          </div>
          <div className="flex w-full gap-2">
            <Input
              type="password"
              value={devToken}
              onChange={(e) => setDevToken(e.target.value)}
              placeholder="Paste access token"
              disabled={isConnecting}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && devToken.trim()) loginWithToken(devToken.trim())
              }}
            />
            <Button
              variant="secondary"
              onClick={() => { if (devToken.trim()) loginWithToken(devToken.trim()) }}
              disabled={isConnecting || !devToken.trim()}
            >
              Go
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
