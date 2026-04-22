# NeLS Desktop

Desktop client for uploading files to your [NeLS](https://nels.elixir.no) personal storage area. Authenticates via Feide and transfers files over SFTP — no manual SSH configuration required.

## Prerequisites (Linux)

**Node.js 20+** and **npm**:

```bash
# Using nvm (recommended)
nvm install 20
nvm use 20

# Or via your distro's package manager (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**libsecret** — required by keytar to access the GNOME keychain:

```bash
sudo apt-get install -y libsecret-1-dev
```

## Setup

```bash
git clone <repo-url>
cd nels-uncle
npm install
npm run rebuild       # recompile keytar against your Electron version
```

## Run in development

```bash
npm run dev
```

This starts Electron pointing at the Vite dev server (hot reload). On first launch you will see the login screen. Clicking **Login with Feide** opens the staging NeLS OAuth page in your system browser. After completing the Feide login, the OS routes the `nels://auth/callback` URL back to the app.

> **Note:** The OAuth client (`nels_desktop`) must be registered on the staging server with `redirect_uri: "nels://auth/callback"` before login will work. See the [OAuth client registration](#oauth-client-registration) section.

## Run tests

```bash
npm test
```

## Build a distributable (AppImage)

```bash
npm run package
```

The AppImage lands in `release/`. To run it:

```bash
chmod +x release/*.AppImage
./release/*.AppImage
```

## OAuth client registration

The app uses the `nels_desktop` implicit-flow OAuth client. Add the following entry to the `oauth2_implicit_clients` array in the nels-oauth2 `config.json` on the staging server, then restart the service:

```json
{
  "client_id": "nels_desktop",
  "client_secret": "REPLACE-ME",
  "redirect_uri": "nels://auth/callback"
}
```

## Environment variables (optional)

All defaults point to staging. Override via a `.env` file or shell environment:

| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE` | `https://staging.nels.elixir.no/nels-api2` | NeLS API base URL |
| `VITE_OAUTH_BASE` | `https://staging.nels.elixir.no/oauth2` | OAuth server base URL |
| `VITE_CLIENT_ID` | `nels_desktop` | OAuth client ID |
| `VITE_SSH_LOGIN_HOST` | `slogin.nels.elixir.no` | SSH bastion host |
| `VITE_SSH_DATA_HOST` | `sdata.nels.elixir.no` | SSH data host |
