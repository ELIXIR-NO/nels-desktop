# NeLS Desktop

A desktop app for uploading, browsing, and managing files in your [NeLS](https://nels.elixir.no) personal storage and project folders — without configuring SSH tunnels, keys, or ProxyJump.

Sign in with Feide, drag files into the window, done.

> **Heads up — this build points at the NeLS *staging* environment (`staging.nels.elixir.no`).** Anything you upload goes to staging storage, not production.

---

## What you can do

- **Log in with Feide / NeLS** — the same OAuth flow you use on the web.
- **Browse Personal and project storage** — projects you have filesystem access to show up in the sidebar automatically.
- **Upload files** by dragging them onto the window or picking them with the Upload button. Progress is visible in a dock at the bottom; multiple uploads run in parallel.
- **Create folders** inside Personal or any project.
- **Delete files and folders** (recursive). Protected paths — Personal root, project roots, `$HOME` root — are blocked by the app.
- **Light and dark mode**, following your OS by default.

## Install

Download the installer for your OS from the [latest release](https://github.com/yasinmiran/nels-desktop/releases/latest):

| OS | File |
|---|---|
| macOS (Intel + Apple Silicon) | `NeLS-x.y.z.dmg` |
| Windows 10 / 11 | `NeLS Setup x.y.z.exe` |
| Linux | `NeLS-x.y.z.AppImage` |

### macOS

Open the `.dmg`, drag NeLS into `Applications`, then clear the quarantine flag macOS attaches to downloaded apps:

```bash
xattr -dr com.apple.quarantine /Applications/NeLS.app
```

Launch normally after that. You only need to do this once per install.

Without the `xattr` step, macOS (especially Apple Silicon) shows **"NeLS is damaged and cannot be opened. You should move it to the Bin."** — that's the Gatekeeper check refusing to run unsigned binaries. If it's already been moved to the Bin, restore it, run the command above, then launch. The binary isn't actually damaged.

This will go away when the app is code-signed and notarized by an Apple Developer account.

### Windows

Run the `.exe`. SmartScreen may warn ("Windows protected your PC") — click **More info → Run anyway**.

### Linux (AppImage)

```bash
chmod +x NeLS-*.AppImage
./NeLS-*.AppImage
```

On GNOME/KDE you can also double-click to run. You'll need `libsecret` for the keychain integration:

```bash
# Debian/Ubuntu
sudo apt install libsecret-1-0

# Fedora/RHEL
sudo dnf install libsecret
```

The first time the app needs your SSH key it will be stored in your OS keychain (GNOME Keyring / macOS Keychain / Windows Credential Manager). Your SSH key never touches disk as a file.

## Using the app

1. **Launch** the app. You'll see a sign-in screen.
2. **Click "Login with Feide"** — your browser opens, you complete the normal Feide flow, and the app picks up the session automatically.
   - If the redirect doesn't come back (happens sometimes on Linux), copy an access token from the NeLS web UI and paste it into the "Or sign in with a token" field.
3. You'll land in **Personal**. Your projects are listed in the left sidebar.
4. **Upload** by dragging files anywhere into the window, or click **Upload files** in the top bar.
5. **Create a folder** with the folder+ icon.
6. **Delete** by hovering a row and clicking the trash icon. You'll be asked to confirm.
7. **Settings** (user menu → Settings) shows the exact endpoints and session the app is talking to — useful when troubleshooting.

## Configuration

The installed build points at **staging** out of the box. Environment variables (set before launch) can override this:

| Variable | Default |
|---|---|
| `VITE_API_BASE` | `https://staging.nels.elixir.no/nels-api2` |
| `VITE_OAUTH_BASE` | `https://staging.nels.elixir.no/oauth2` |
| `VITE_SSH_LOGIN_HOST` | `slogin.nels.elixir.no` |
| `VITE_SSH_DATA_HOST` | `sdata.nels.elixir.no` |
| `VITE_SSH_LOGIN_FP` | staging fingerprint |
| `VITE_SSH_DATA_FP` | staging fingerprint |

These are normally only useful if you're building a custom version.

## Troubleshooting

- **"Could not load folder"** — open **Settings** from the user menu, check the SFTP and API URLs look right, and share the "Copy report" output when asking for help.
- **Login stuck on "Connecting…"** — the `nels://` redirect didn't arrive. Use the token-paste fallback on the login screen.
- **"Fingerprint mismatch"** — the SSH host key on the server has rotated, or you're pointed at the wrong environment. File an issue with the reported fingerprint.
- **Uploads fail in a project** — your role may not grant write access. Data Managers and PIs can write/delete; Normal Users in some projects are read-only.
- **macOS says the app is damaged / moves it to Bin** — it's not damaged; it's the Gatekeeper check on unsigned apps. See the macOS install section above for the `xattr` command that clears the quarantine flag.

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
