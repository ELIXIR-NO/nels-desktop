export const config = {
  apiBase: import.meta.env.VITE_API_BASE ?? 'https://staging.nels.elixir.no/nels-api2',
  oauthBase: import.meta.env.VITE_OAUTH_BASE ?? 'https://staging.nels.elixir.no/oauth2',
  clientId: import.meta.env.VITE_CLIENT_ID ?? 'nels_desktop',
  redirectUri: 'nels://auth/callback',
  ssh: {
    loginHost: import.meta.env.VITE_SSH_LOGIN_HOST ?? 'slogin.nels.elixir.no',
    dataHost: import.meta.env.VITE_SSH_DATA_HOST ?? 'sdata.nels.elixir.no',
    // Base64 portion of SHA256:... fingerprint (staging values)
    loginFingerprint: import.meta.env.VITE_SSH_LOGIN_FP
      ?? 'WpQOHB6/LxoWXl7nFQ8wZg1t2VV6B02CgQRX9TGjbfY',
    dataFingerprint: import.meta.env.VITE_SSH_DATA_FP
      ?? 'iNErUTtIXChkdmg4RJl7F3D5qGtnrK6yLkF5na/l7sc',
  }
} as const
