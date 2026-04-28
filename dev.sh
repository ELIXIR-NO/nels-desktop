#!/usr/bin/env bash
#
# NeLS Desktop release helper. Bumps package.json, commits, tags, and
# (optionally) pushes — matching the tag shapes the build workflow accepts:
#
#   vMAJOR.MINOR.PATCH               -> production build (publishes to /releases/latest)
#   vMAJOR.MINOR.PATCH-staging.N     -> staging prerelease (marked --prerelease in CI)
#
# Usage:
#   ./dev.sh staging              # 0.1.0-staging.4   -> 0.1.0-staging.5
#   ./dev.sh patch                # 0.1.0-staging.4   -> 0.1.1-staging.1
#   ./dev.sh minor                # 0.1.0-staging.4   -> 0.2.0-staging.1
#   ./dev.sh major                # 0.1.0-staging.4   -> 1.0.0-staging.1
#   ./dev.sh promote              # 0.1.0-staging.4   -> 0.1.0  (production)
#   ./dev.sh --dry-run staging    # show what would happen, do nothing
#
set -euo pipefail

cd "$(dirname "$0")"

log()  { printf '\033[0;36m[nels]\033[0m %s\n' "$*"; }
warn() { printf '\033[0;33m[nels]\033[0m %s\n' "$*" >&2; }
err()  { printf '\033[0;31m[nels]\033[0m %s\n' "$*" >&2; exit 1; }

DRY_RUN=0
CMD=""
for arg in "$@"; do
  case "$arg" in
    --dry-run|-n) DRY_RUN=1 ;;
    staging|promote|patch|minor|major) CMD="$arg" ;;
    -h|--help)
      grep '^#' "$0" | sed 's/^# \{0,1\}//' | head -n 16
      exit 0
      ;;
    *) err "Unknown argument: $arg (run with --help)" ;;
  esac
done
[[ -n "$CMD" ]] || err "Missing subcommand. Try: staging | patch | minor | major | promote"

# --- sanity checks --------------------------------------------------------

command -v git >/dev/null  || err "git not found"
command -v node >/dev/null || err "node not found (needed to read/write package.json)"
[[ -f package.json ]]      || err "package.json not found in $(pwd)"

git rev-parse --is-inside-work-tree >/dev/null 2>&1 || err "Not inside a git repository."

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$BRANCH" != "main" ]]; then
  err "Refusing to release from branch '$BRANCH'. Switch to main first."
fi

if ! git diff --quiet || ! git diff --cached --quiet; then
  err "Working tree is dirty. Commit or stash changes before releasing."
fi

# Verify the local main matches origin/main. Releasing from a stale branch
# tags a commit that nobody else has, which then trips up the next person
# who cuts a release from a different machine.
git fetch --quiet origin main || warn "Could not fetch origin/main — proceeding with local view"
LOCAL="$(git rev-parse HEAD)"
REMOTE="$(git rev-parse origin/main 2>/dev/null || echo "$LOCAL")"
if [[ "$LOCAL" != "$REMOTE" ]]; then
  err "Local main is not in sync with origin/main. Pull/push first."
fi

# --- compute next version -------------------------------------------------

CURRENT="$(node -p "require('./package.json').version")"
log "Current version: $CURRENT"

# Parse vMAJOR.MINOR.PATCH[-staging.N]. Anything else is a foreign shape we
# don't know how to bump — fail loud rather than guess.
if [[ "$CURRENT" =~ ^([0-9]+)\.([0-9]+)\.([0-9]+)(-staging\.([0-9]+))?$ ]]; then
  MAJOR="${BASH_REMATCH[1]}"
  MINOR="${BASH_REMATCH[2]}"
  PATCH="${BASH_REMATCH[3]}"
  STAGING_N="${BASH_REMATCH[5]:-}"
else
  err "Cannot parse current version '$CURRENT'. Expected MAJOR.MINOR.PATCH[-staging.N]."
fi

case "$CMD" in
  staging)
    if [[ -z "$STAGING_N" ]]; then
      # Promoting from prod back into staging would be unusual — start at .1
      NEXT="${MAJOR}.${MINOR}.$((PATCH + 1))-staging.1"
    else
      NEXT="${MAJOR}.${MINOR}.${PATCH}-staging.$((STAGING_N + 1))"
    fi
    ;;
  patch) NEXT="${MAJOR}.${MINOR}.$((PATCH + 1))-staging.1" ;;
  minor) NEXT="${MAJOR}.$((MINOR + 1)).0-staging.1" ;;
  major) NEXT="$((MAJOR + 1)).0.0-staging.1" ;;
  promote)
    [[ -n "$STAGING_N" ]] || err "Cannot promote: $CURRENT is already a production version."
    NEXT="${MAJOR}.${MINOR}.${PATCH}"
    ;;
esac

TAG="v${NEXT}"

if git rev-parse "$TAG" >/dev/null 2>&1; then
  err "Tag $TAG already exists locally."
fi
if git ls-remote --tags origin "refs/tags/$TAG" | grep -q "$TAG"; then
  err "Tag $TAG already exists on origin."
fi

log "Next version:    $NEXT"
log "Tag to create:   $TAG"
case "$CMD" in
  promote) log "Build target:    PRODUCTION (latest release)" ;;
  *)       log "Build target:    STAGING (prerelease)" ;;
esac

if [[ "$DRY_RUN" == "1" ]]; then
  log "Dry run — no changes made."
  exit 0
fi

# --- confirm --------------------------------------------------------------

read -r -p "Proceed with bump, commit, and tag? [y/N] " ANSWER
[[ "$ANSWER" =~ ^[yY]$ ]] || { log "Aborted."; exit 0; }

# --- bump, commit, tag ----------------------------------------------------

# Use node rather than sed/jq so the formatting (2-space indent, trailing
# newline) stays identical to whatever npm itself would produce. Any other
# whitespace drift here pollutes future diffs.
node -e "
  const fs = require('fs');
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  pkg.version = '$NEXT';
  fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"

git add package.json
git commit -m "Bump version to $NEXT"
git tag -a "$TAG" -m "Release $TAG"

log "Created commit $(git rev-parse --short HEAD) and tag $TAG locally."

# --- push -----------------------------------------------------------------

read -r -p "Push commit and tag to origin? [y/N] " ANSWER
if [[ "$ANSWER" =~ ^[yY]$ ]]; then
  git push origin main
  git push origin "$TAG"
  log "Pushed. CI will build and publish from $TAG."
  log "Watch: https://github.com/yasinmiran/nels-desktop/actions"
else
  log "Skipped push. To push manually:"
  log "  git push origin main && git push origin $TAG"
  log "To undo locally: git tag -d $TAG && git reset --hard HEAD~1"
fi
