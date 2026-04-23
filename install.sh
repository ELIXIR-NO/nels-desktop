#!/usr/bin/env bash
#
# NeLS Desktop installer for macOS and Linux.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/yasinmiran/nels-desktop/main/install.sh | bash
#
# Fetches the latest release from GitHub, downloads the right asset for your
# OS, and installs it. On macOS it clears the Gatekeeper quarantine flag so
# you won't see the "damaged" error. On Linux it drops the AppImage into
# ~/Applications and marks it executable.
#
set -euo pipefail

REPO="yasinmiran/nels-desktop"
APP_NAME="NeLS"
TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

log()  { printf '\033[0;36m[nels]\033[0m %s\n' "$*"; }
err()  { printf '\033[0;31m[nels]\033[0m %s\n' "$*" >&2; exit 1; }

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

log "Fetching latest release metadata from $REPO..."
META="$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest")"

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
    log "Launch with: $DEST"
    log "Tip: if you don't have libsecret installed, run 'sudo apt install libsecret-1-0' (Debian/Ubuntu) or 'sudo dnf install libsecret' (Fedora/RHEL)."
    ;;
esac
