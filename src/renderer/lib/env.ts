// Single source of truth for renderer build-time environment.
//
// electron-vite bakes these VITE_* values in at build time; staging is the
// default so dev + untagged builds point at staging.nels.elixir.no. CI
// overrides them for production tag builds. Keep fallbacks in sync with
// src/main/config.ts — both processes must agree on the target.

const apiBase =
  import.meta.env.VITE_API_BASE ?? 'https://staging.nels.elixir.no/nels-api2'

const host = (() => {
  try {
    return new URL(apiBase).host
  } catch {
    return 'nels.elixir.no'
  }
})()

export const env = {
  apiBase,
  host,
  isStaging: host.startsWith('staging.') || host.includes('.staging.'),
  oauthBase:
    import.meta.env.VITE_OAUTH_BASE ?? 'https://staging.nels.elixir.no/oauth2',
  loginHost: import.meta.env.VITE_SSH_LOGIN_HOST ?? 'slogin.nels.elixir.no',
  dataHost: import.meta.env.VITE_SSH_DATA_HOST ?? 'sdata.nels.elixir.no',
} as const
