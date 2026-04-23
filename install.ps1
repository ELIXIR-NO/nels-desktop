# NeLS Desktop installer for Windows.
#
# Usage:
#   iwr -useb https://raw.githubusercontent.com/yasinmiran/nels-desktop/main/install.ps1 | iex
#
# To install a staging (prerelease) build instead of the latest stable one,
# set the NELS_STAGING environment variable to 1 first:
#   $env:NELS_STAGING=1; iwr -useb https://.../install.ps1 | iex
#
# Fetches the matching release from GitHub and runs the NSIS installer.

$ErrorActionPreference = 'Stop'

$Repo = 'yasinmiran/nels-desktop'
$AppName = 'NeLS'

function Write-Info($Message) {
    Write-Host "[nels] $Message" -ForegroundColor Cyan
}

function Write-Fail($Message) {
    Write-Host "[nels] $Message" -ForegroundColor Red
    exit 1
}

if ($env:NELS_STAGING -eq '1') {
    Write-Info "NELS_STAGING=1 — selecting the latest -staging prerelease from $Repo"
    try {
        $all = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/releases" -UseBasicParsing
    } catch {
        Write-Fail "Could not reach GitHub: $($_.Exception.Message)"
    }
    $release = $all | Where-Object { $_.tag_name -like '*-staging.*' } | Select-Object -First 1
    if (-not $release) { Write-Fail "No -staging prerelease found on $Repo." }
} else {
    Write-Info "Fetching latest release metadata from $Repo..."
    try {
        $release = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/releases/latest" -UseBasicParsing
    } catch {
        Write-Fail "Could not fetch a stable release. Set `$env:NELS_STAGING=1 if you want a staging build. ($($_.Exception.Message))"
    }
}

$tag = $release.tag_name
if (-not $tag) { Write-Fail "Could not read release tag from GitHub." }

$asset = $release.assets | Where-Object { $_.name -like '*Setup*.exe' } | Select-Object -First 1
if (-not $asset) { Write-Fail "No *Setup*.exe asset found in release $tag." }

Write-Info "Installing $AppName $tag"
Write-Info "Downloading $($asset.name)"

$tmp = Join-Path ([System.IO.Path]::GetTempPath()) "nels-$tag-$(Get-Random).exe"
try {
    Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $tmp -UseBasicParsing
} catch {
    Write-Fail "Download failed: $($_.Exception.Message)"
}

Write-Info "Running installer (SmartScreen may warn — click 'More info' > 'Run anyway' if prompted)"
Start-Process -FilePath $tmp -Wait

Remove-Item $tmp -ErrorAction SilentlyContinue
Write-Info "Done. Launch $AppName from the Start menu."
