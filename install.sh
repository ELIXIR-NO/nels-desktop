#!/usr/bin/env bash
#
# NeLS Desktop installer for macOS and Linux.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/ELIXIR-NO/nels-desktop/main/install.sh | bash
#
# To install a staging (prerelease) build instead of the latest stable one,
# pass --staging as a positional argument (remember the `-s --`), or put the
# env var on `bash` itself (not on `curl`):
#   curl -fsSL https://.../install.sh | bash -s -- --staging
#   curl -fsSL https://.../install.sh | NELS_STAGING=1 bash
#
# Why not `NELS_STAGING=1 curl ... | bash`? That form only scopes the env var
# to `curl`; `bash` reads the script with an empty env and ignores it. Classic
# shell gotcha.
#
set -euo pipefail

REPO="ELIXIR-NO/nels-desktop"
APP_NAME="NeLS"
TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

log()  { printf '\033[0;36m[nels]\033[0m %s\n' "$*"; }
err()  { printf '\033[0;31m[nels]\033[0m %s\n' "$*" >&2; exit 1; }

# Parse args: --staging selects the latest prerelease. Env var works too.
WANT_STAGING=0
if [[ "${NELS_STAGING:-}" == "1" ]]; then WANT_STAGING=1; fi
for arg in "$@"; do
  case "$arg" in
    --staging) WANT_STAGING=1 ;;
    -h|--help)
      grep '^#' "$0" | sed 's/^# \{0,1\}//' | head -n 20
      exit 0
      ;;
  esac
done

if [[ "${EUID:-$(id -u)}" -eq 0 ]]; then
  err "Do not run this script as root. Run it as your normal user."
fi

command -v curl >/dev/null 2>&1 || err "curl is required but not installed."

OS="$(uname -s)"
ARCH="$(uname -m)"

case "$OS" in
  Darwin)
    if [[ "$ARCH" != "arm64" ]]; then
      log "Warning: only Apple Silicon builds are published. Installing anyway — it will not run on Intel Macs."
    fi
    PATTERN='\.dmg"'
    ;;
  Linux)
    PATTERN='\.AppImage"'
    ;;
  *)
    err "Unsupported OS: $OS. This installer only supports macOS and Linux."
    ;;
esac

if [[ "$WANT_STAGING" == "1" ]]; then
  command -v python3 >/dev/null 2>&1 \
    || err "Staging mode needs python3 to filter prereleases, but python3 wasn't found."
  log "Staging mode — selecting the latest -staging prerelease from $REPO"
  # Pretty-print the filtered release so each asset's browser_download_url
  # ends up on its own line — the grep pattern below needs that to avoid
  # picking a random asset off a single-line compact JSON blob.
  META="$(curl -fsSL "https://api.github.com/repos/$REPO/releases" \
    | python3 -c 'import json,sys; rs=json.load(sys.stdin); r=next((x for x in rs if "-staging." in x.get("tag_name","")), None); sys.stdout.write(json.dumps(r or {}, indent=2))')"
  [[ "$META" != "{}" ]] || err "No -staging prerelease found on $REPO."
else
  log "Fetching latest release metadata from $REPO..."
  META="$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest")" \
    || err "Could not fetch a stable release. Try: curl ... | bash -s -- --staging"
fi

TAG="$(printf '%s' "$META" | grep -m1 '"tag_name"' | sed -E 's/.*"tag_name": *"([^"]+)".*/\1/')"
URL="$(printf '%s' "$META" \
  | grep -E '"browser_download_url".*'"$PATTERN" \
  | head -n1 \
  | sed -E 's/.*"browser_download_url": *"([^"]+)".*/\1/')"

[[ -n "$TAG" ]] || err "Could not read release tag from GitHub."
[[ -n "$URL" ]] || err "Could not find a download URL matching $PATTERN in release $TAG."

log "Installing $APP_NAME $TAG"
log "Downloading $URL"

ASSET="$TMPDIR/$(basename "$URL")"
curl -fL --progress-bar "$URL" -o "$ASSET"

case "$OS" in
  Darwin)
    MOUNT="$(mktemp -d)"
    trap 'hdiutil detach "$MOUNT" >/dev/null 2>&1 || true; rm -rf "$TMPDIR" "$MOUNT"' EXIT

    log "Mounting disk image..."
    hdiutil attach "$ASSET" -nobrowse -quiet -mountpoint "$MOUNT"

    APP_SRC="$MOUNT/$APP_NAME.app"
    [[ -d "$APP_SRC" ]] || err "Did not find $APP_NAME.app inside the DMG."

    APP_DEST="/Applications/$APP_NAME.app"
    if [[ -e "$APP_DEST" ]]; then
      log "Removing existing $APP_DEST"
      rm -rf "$APP_DEST"
    fi

    log "Copying to /Applications"
    cp -R "$APP_SRC" "$APP_DEST"

    log "Clearing Gatekeeper quarantine flag"
    xattr -dr com.apple.quarantine "$APP_DEST" 2>/dev/null || true

    hdiutil detach "$MOUNT" -quiet

    # Desktop shortcut via symlink. macOS doesn't have a native "shortcut"
    # concept for apps — Finder treats a symlink to an .app bundle as a
    # launchable alias, which is the closest equivalent. Convention on
    # macOS is to launch via Spotlight / Launchpad / /Applications, so
    # this is best-effort: we skip silently if ~/Desktop doesn't exist.
    if [[ -d "$HOME/Desktop" ]]; then
      DESKTOP_LINK="$HOME/Desktop/$APP_NAME.app"
      [[ -L "$DESKTOP_LINK" || -e "$DESKTOP_LINK" ]] && rm -rf "$DESKTOP_LINK"
      ln -s "$APP_DEST" "$DESKTOP_LINK"
      log "Created Desktop shortcut: $DESKTOP_LINK"
    fi

    log "Installed. Launch from Applications or run: open -a \"$APP_NAME\""
    ;;
  Linux)
    DEST_DIR="$HOME/Applications"
    mkdir -p "$DEST_DIR"
    DEST="$DEST_DIR/$APP_NAME.AppImage"

    if [[ -e "$DEST" ]]; then
      log "Replacing existing $DEST"
      rm -f "$DEST"
    fi

    mv "$ASSET" "$DEST"
    chmod +x "$DEST"
    log "Installed to $DEST"

    # System integration: a .desktop file in ~/.local/share/applications/
    # makes the app discoverable from the activities overview / app menu,
    # and a copy on ~/Desktop/ creates the actual desktop shortcut.
    ICON_DIR="$HOME/.local/share/icons"
    APP_DIR="$HOME/.local/share/applications"
    ICON="$ICON_DIR/nels-desktop.png"
    ENTRY="$APP_DIR/nels-desktop.desktop"
    mkdir -p "$ICON_DIR" "$APP_DIR"

    if [[ ! -f "$ICON" ]]; then
      curl -fsSL "https://raw.githubusercontent.com/$REPO/main/build/icon.png" -o "$ICON" \
        || log "Warning: couldn't fetch icon from GitHub — shortcut will fall back to the default icon."
    fi

    cat > "$ENTRY" <<EOF
[Desktop Entry]
Type=Application
Version=1.0
Name=$APP_NAME
GenericName=NeLS file uploader
Comment=Upload and browse files in NeLS storage
Exec=$DEST %U
Icon=$ICON
Categories=Utility;Network;FileTransfer;
Terminal=false
StartupWMClass=NeLS
EOF
    chmod +x "$ENTRY"

    # Refresh the desktop DB so the menu picks up the new entry without
    # a logout — silently ignore if the command isn't installed.
    update-desktop-database "$APP_DIR" >/dev/null 2>&1 || true

    # Desktop shortcut. Modern GNOME/KDE requires .desktop files on the
    # desktop to be marked trusted before they'll launch without a prompt.
    # gio handles that on GNOME; KDE honours the executable bit alone.
    if [[ -d "$HOME/Desktop" ]]; then
      DESKTOP_LINK="$HOME/Desktop/$APP_NAME.desktop"
      cp "$ENTRY" "$DESKTOP_LINK"
      chmod +x "$DESKTOP_LINK"
      gio set "$DESKTOP_LINK" metadata::trusted true >/dev/null 2>&1 || true
      log "Created Desktop shortcut: $DESKTOP_LINK"
    fi

    log "Launch with: $DEST (or find NeLS in your app menu)"
    log "Tip: if you don't have libsecret installed, run 'sudo apt install libsecret-1-0' (Debian/Ubuntu) or 'sudo dnf install libsecret' (Fedora/RHEL)."
    ;;
esac
