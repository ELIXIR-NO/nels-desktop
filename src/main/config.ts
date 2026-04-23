export const config = {
  apiBase: import.meta.env.VITE_API_BASE ?? 'https://nels.elixir.no/nels-api2',
  oauthBase: import.meta.env.VITE_OAUTH_BASE ?? 'https://nels.elixir.no/oauth2',
  clientId: import.meta.env.VITE_CLIENT_ID ?? 'nels_desktop',
  redirectUri: 'nels://auth/callback',
  ssh: {
    loginHost: import.meta.env.VITE_SSH_LOGIN_HOST ?? 'login.nels.elixir.no',
    dataHost: import.meta.env.VITE_SSH_DATA_HOST ?? 'data.nels.elixir.no',
    // Base64 portion of SHA256:... fingerprint (production values)
    loginFingerprint: import.meta.env.VITE_SSH_LOGIN_FP
      ?? 'D88VKPfCDylk3J83XGSIRrGk6UyLwx4nC85ljmjhFCY',
    dataFingerprint: import.meta.env.VITE_SSH_DATA_FP
      ?? 'jtIIVCQPOXFvOkUIaTrfwYroV/3mEZ6PL7/tMMphO4o',
  }
} as const
