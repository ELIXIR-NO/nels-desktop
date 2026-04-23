# NeLS Desktop

A desktop app for uploading, browsing, and managing files in your [NeLS](https://nels.elixir.no) personal storage and project folders — without configuring SSH tunnels, keys, or ProxyJump.

Paste your access token, drag files into the window, done.

---

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

The script downloads the latest release, clears the macOS quarantine flag, and places the app in `/Applications` (macOS) or `~/Applications` (Linux).

### Windows (one-liner)

Run in PowerShell:

```powershell
iwr -useb https://raw.githubusercontent.com/yasinmiran/nels-desktop/main/install.ps1 | iex
```

### Manual download

If you prefer to download yourself, grab the installer from the [latest release](https://github.com/yasinmiran/nels-desktop/releases/latest):

| OS | File |
|---|---|
| macOS (Apple Silicon) | `NeLS-x.y.z.dmg` |
| Windows 10 / 11 | `NeLS Setup x.y.z.exe` |
| Linux | `NeLS-x.y.z.AppImage` |

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

The first time the app needs your SSH key, it will be stored in your OS keychain (GNOME Keyring / macOS Keychain / Windows Credential Manager). Your SSH key never touches disk as a file.

## Using the app

1. **Launch** the app. You'll see the login screen.
2. **Grab an access token** from the NeLS web UI (your profile page on `nels.elixir.no`).
3. **Paste it** into the Access token field and click **Login**. The app validates the token, fetches your SSH credential, and stores it in your OS keychain.
4. You'll land in **Personal**. Your projects appear in the left sidebar.
5. **Upload** by dragging files anywhere into the window, or click **Upload files** in the top bar.
6. **Create a folder** with the folder+ icon.
7. **Delete** by hovering a row and clicking the trash icon. You'll be asked to confirm.
8. **Settings** (user menu → Settings) shows the exact endpoints and session the app is talking to — useful when troubleshooting.

## Configuration

The installed build targets **production** out of the box. Environment variables (set before launch) can override this:

| Variable | Default |
|---|---|
| `VITE_API_BASE` | `https://nels.elixir.no/nels-api2` |
| `VITE_OAUTH_BASE` | `https://nels.elixir.no/oauth2` |
| `VITE_SSH_LOGIN_HOST` | `login.nels.elixir.no` |
| `VITE_SSH_DATA_HOST` | `data.nels.elixir.no` |
| `VITE_SSH_LOGIN_FP` | production fingerprint |
| `VITE_SSH_DATA_FP` | production fingerprint |

These are normally only useful if you're building a custom version or pointing a dev build at staging.

## Troubleshooting

- **"Bastion SSH error: timed out while waiting for handshake"** — your machine can't reach `login.nels.elixir.no:22`. Check your firewall or network egress rules. You can confirm reachability with `nc -vz login.nels.elixir.no 22`.
- **"Could not load folder"** — open **Settings** from the user menu, check the SFTP and API URLs look right, and share the "Copy report" output when asking for help.
- **"Token validation failed"** — the token has expired or is malformed. Get a fresh one from the web UI.
- **"Fingerprint mismatch"** — the SSH host key on the server has rotated, or you're pointed at the wrong environment. File an issue with the reported fingerprint.
- **Uploads fail in a project** — your role may not grant write access. Data Managers and PIs can write/delete; Normal Users in some projects are read-only.
- **macOS says the app is damaged / moves it to Bin** — it's not damaged; it's Gatekeeper blocking unsigned apps. See the macOS install section above for the `xattr` command that clears the quarantine flag. Using the install script does this automatically.

## Reporting issues

Open an issue at https://github.com/yasinmiran/nels-desktop/issues. Include the diagnostic report from **Settings → Copy report** if you can — it has the exact versions and endpoints the app is using.

---

## Building from source

If you want to build the app yourself:

```bash
# Prerequisites: Node.js 20+, npm, and (on Linux) libsecret-1-dev
git clone https://github.com/yasinmiran/nels-desktop.git
cd nels-desktop
npm install
npm run rebuild      # recompile keytar against the Electron version
npm run dev          # or: npm run package (produces installer in release/)
```

Tests: `npm test`. Type check: `npx tsc --noEmit`.

Releases are produced by GitHub Actions on `v*` tags — see `.github/workflows/build.yml` and `electron-builder.yml` for the details.
