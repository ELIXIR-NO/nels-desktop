# NeLS Desktop

A desktop app for uploading, browsing, and managing files over SFTP in your [NeLS](https://nels.elixir.no) personal storage and project folders — without configuring SSH tunnels, keys, or ProxyJump.

Paste your access token, drag files into the window, done. Curious what happens under the hood? The **?** button in the header shows you.

> **Heads up — this is a `-staging.N` build and points at the NeLS *staging* environment (`staging.nels.elixir.no`).** Anything you upload goes to staging storage, not production. A thin amber banner at the top of the app reminds you which environment is active.
>
> **Staging requires VPN.** You need to be on the NeLS / Sigma2 / institutional VPN, otherwise the SFTP connection will time out with *"Bastion SSH error: timed out while waiting for handshake"*. Production endpoints do not require VPN.

---

## Release variants

The same codebase ships in two flavours, distinguished by the semver suffix on the tag and version:

| Variant | Tag | Artifact | GitHub release | Login |
|---|---|---|---|---|
| Staging / RC | `v0.1.0-staging.N` | `NeLS-0.1.0-staging.N.dmg` etc. | Marked *prerelease* | Paste an access token from the NeLS staging web UI |
| Production | `v0.1.0` (no suffix) | `NeLS-0.1.0.dmg` etc. | Stable release | Feide SSO (once the OAuth flow is stable) |

`-staging.N` builds target the staging API, OAuth, and SFTP endpoints. Production builds target `nels.elixir.no`. CI detects the suffix on the tag and injects the right env vars at build time — see `.github/workflows/build.yml`.

The `/releases/latest` endpoint on GitHub skips prereleases, so the install one-liners below will always prefer a production release when one exists. Staging builds are downloaded manually from the release page.

## What you can do

- **Sign in with an access token** from the NeLS web UI — single sign-on is temporarily unavailable while the implicit-grant flow is being stabilised.
- **Browse Personal and project storage** — projects you have filesystem access to show up in the sidebar automatically.
- **Upload files** by dragging them onto the window or picking them with the Upload button. Progress is visible in a dock at the bottom; multiple uploads run in parallel.
- **Create folders** inside Personal or any project.
- **Delete files and folders** (recursive). Protected paths — Personal root, project roots, `$HOME` root — are blocked by the app.
- **Light and dark mode**, following your OS by default.

## Install

### macOS and Linux (one-liner)

```bash
curl -fsSL https://raw.githubusercontent.com/yasinmiran/nels-desktop/main/install.sh | bash
```

The script downloads the latest *production* release, clears the macOS quarantine flag, and places the app in `/Applications` (macOS) or `~/Applications` (Linux). Until a production release exists, the script will fail — grab a staging build manually (see below).

### Windows (one-liner)

```powershell
iwr -useb https://raw.githubusercontent.com/yasinmiran/nels-desktop/main/install.ps1 | iex
```

### Manual download (required for staging builds)

Grab the installer from the [releases page](https://github.com/yasinmiran/nels-desktop/releases). Prereleases (staging builds) are listed alongside stable ones.

| OS | File |
|---|---|
| macOS (Apple Silicon) | `NeLS-x.y.z[-staging.N].dmg` |
| Windows 10 / 11 | `NeLS Setup x.y.z[-staging.N].exe` |
| Linux | `NeLS-x.y.z[-staging.N].AppImage` |

**macOS manual install:** open the `.dmg`, drag NeLS into `Applications`, then run:

```bash
xattr -dr com.apple.quarantine /Applications/NeLS.app
```

That clears the quarantine flag macOS attaches to downloaded apps. Without it, Apple Silicon shows **"NeLS is damaged and cannot be opened"** — that's Gatekeeper refusing to run unsigned binaries, not an actual broken download. You only need to do this once per install. It will go away once the app is signed and notarized with an Apple Developer ID.

**Windows manual install:** run the `.exe`. SmartScreen may warn ("Windows protected your PC") — click **More info → Run anyway**.

**Linux manual install:**

```bash
chmod +x NeLS-*.AppImage
./NeLS-*.AppImage
```

You'll need `libsecret` for the keychain integration:

```bash
# Debian/Ubuntu
sudo apt install libsecret-1-0

# Fedora/RHEL
sudo dnf install libsecret
```

The first time the app needs your SSH key, it will be stored in your OS keychain (GNOME Keyring / macOS Keychain / Windows Credential Manager). Your SSH key never touches disk as a plain file.

## Using the app

1. **Launch** the app. On a staging build you'll see an amber banner across the top — that's your reminder that the app is talking to staging.
2. **Grab an access token** from the NeLS staging web UI (your profile page on `staging.nels.elixir.no`).
3. **Paste it** into the Access token field and click **Login**. The app validates the token, fetches your SSH credential, and stores it in your OS keychain.
4. You'll land in **Personal**. Your projects appear in the left sidebar.
5. **Upload** by dragging files anywhere into the window, or click **Upload files** in the top bar.
6. **Create a folder** with the folder+ icon.
7. **Delete** by hovering a row and clicking the trash icon. You'll be asked to confirm.
8. **Settings** (user menu → Settings) shows the exact endpoints and session the app is talking to — useful when troubleshooting.

## Configuration

The default build targets **staging**. Environment variables baked in at build time override the defaults:

| Variable | Staging default | Production value |
|---|---|---|
| `VITE_API_BASE` | `https://staging.nels.elixir.no/nels-api2` | `https://nels.elixir.no/nels-api2` |
| `VITE_OAUTH_BASE` | `https://staging.nels.elixir.no/oauth2` | `https://nels.elixir.no/oauth2` |
| `VITE_SSH_LOGIN_HOST` | `slogin.nels.elixir.no` | `login.nels.elixir.no` |
| `VITE_SSH_DATA_HOST` | `sdata.nels.elixir.no` | `data.nels.elixir.no` |
| `VITE_SSH_LOGIN_FP` | staging fingerprint | production fingerprint |
| `VITE_SSH_DATA_FP` | staging fingerprint | production fingerprint |

CI substitutes the production values automatically when the tag does not contain `-staging.`. Normally you only set these manually for custom dev builds.

## Troubleshooting

- **"Bastion SSH error: timed out while waiting for handshake"** — your machine can't reach the SSH login host. On staging, connect to VPN first. You can confirm reachability with `nc -vz slogin.nels.elixir.no 22` (staging) or `nc -vz login.nels.elixir.no 22` (production).
- **"Could not load folder"** — open **Settings** from the user menu, check the SFTP and API URLs look right, and share the "Copy report" output when asking for help.
- **"Token validation failed"** — the token has expired or is malformed. Get a fresh one from the web UI.
- **"Fingerprint mismatch"** — the SSH host key on the server has rotated, or you're pointed at the wrong environment. File an issue with the reported fingerprint.
- **Uploads fail in a project** — your role may not grant write access. Data Managers and PIs can write/delete; Normal Users in some projects are read-only.
- **macOS says the app is damaged / moves it to Bin** — it's not damaged; it's Gatekeeper blocking unsigned apps. See the macOS install section above for the `xattr` command that clears the quarantine flag. Using the install script does this automatically.

## Reporting issues

Open an issue at https://github.com/yasinmiran/nels-desktop/issues. Include the diagnostic report from **Settings → Copy report** if you can — it has the exact versions and endpoints the app is using.

---

## Building from source

```bash
# Prerequisites: Node.js 20+, npm, and (on Linux) libsecret-1-dev
git clone https://github.com/yasinmiran/nels-desktop.git
cd nels-desktop
npm install
npm run rebuild      # recompile keytar against the Electron version
npm run dev          # or: npm run package (produces installer in release/)
```

Tests: `npm test`. Type check: `npx tsc --noEmit`.

To build a production-pointing variant locally, set the env vars from the configuration table before `npm run package`.

### Cutting a release

- Staging: bump `package.json` to `0.1.X-staging.N`, commit, tag `v0.1.X-staging.N`, push the tag.
- Production: bump `package.json` to `0.1.X` (no suffix), commit, tag `v0.1.X`, push the tag.

CI detects the tag shape and picks the right env vars. Installers land on the GitHub release automatically.
