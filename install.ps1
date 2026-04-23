# NeLS Desktop installer for Windows.
#
# Usage:
#   iwr -useb https://raw.githubusercontent.com/yasinmiran/nels-desktop/main/install.ps1 | iex
#
# To install a staging (prerelease) build instead of the latest stable one,
# set NELS_STAGING=1 in the same session first:
#   $env:NELS_STAGING=1; iwr -useb https://.../install.ps1 | iex
#
# Fetches the matching release from GitHub and runs the NSIS installer.
# The installer is unsigned — SmartScreen will prompt. Click 'More info'
# then 'Run anyway'.

# Everything runs inside a function so failures use `return` / `throw` and
# don't accidentally `exit` the hosting PowerShell session when the script
# is piped through Invoke-Expression (iex).
function Install-NeLS {
    [CmdletBinding()]
    param()

    $ErrorActionPreference = 'Stop'

    $Repo = 'yasinmiran/nels-desktop'
    $AppName = 'NeLS'

    function Write-Info($Message) {
        Write-Host "[nels] $Message" -ForegroundColor Cyan
    }

    function Write-Warn($Message) {
        Write-Host "[nels] $Message" -ForegroundColor Yellow
    }

    function Write-Fail($Message) {
        # Use Write-Host + throw rather than exit — throw is caught by the
        # outer try/catch and doesn't terminate the session.
        Write-Host "[nels] $Message" -ForegroundColor Red
        throw "install failed"
    }

    if ($env:NELS_STAGING -eq '1') {
        Write-Info "NELS_STAGING=1 - selecting the latest -staging prerelease from $Repo"
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

    # Strip the Mark-of-the-Web so zone-based SmartScreen doesn't block. The
    # reputation-based SmartScreen dialog ("Windows protected your PC")
    # still fires for unsigned binaries and requires a manual click-through
    # until we ship with an Authenticode cert.
    Unblock-File -Path $tmp -ErrorAction SilentlyContinue

    Write-Info "Running installer..."
    Write-Info "If 'Windows protected your PC' appears, click 'More info' -> 'Run anyway'."

    $exitCode = $null
    try {
        $proc = Start-Process -FilePath $tmp -Wait -PassThru
        $exitCode = $proc.ExitCode
    } catch {
        Write-Warn "Start-Process threw: $($_.Exception.Message)"
    }

    Remove-Item $tmp -ErrorAction SilentlyContinue

    # Verify the install actually landed. electron-builder oneClick NSIS
    # puts the app in %LOCALAPPDATA%\Programs\<ProductName>\.
    $expected = Join-Path "$env:LOCALAPPDATA\Programs" "$AppName\$AppName.exe"

    if (Test-Path $expected) {
        Write-Info "Installed at $expected"
        Write-Info "Desktop + Start menu shortcuts should be present (NSIS creates them automatically)."
        Write-Info "Launch $AppName from the Start menu, or run: & '$expected'"
        return
    }

    Write-Host ''
    Write-Host "[nels] Install did not complete." -ForegroundColor Red
    Write-Host "[nels] Expected to find: $expected" -ForegroundColor Red
    if ($null -ne $exitCode) {
        Write-Host "[nels] Installer exit code: $exitCode" -ForegroundColor Red
    }
    Write-Host ''
    Write-Host "[nels] Almost always this means SmartScreen blocked the unsigned installer." -ForegroundColor Yellow
    Write-Host "[nels] Retry manually from a PowerShell window (so you can see the SmartScreen dialog):" -ForegroundColor Yellow
    Write-Host ''
    Write-Host "  `$url = '$($asset.browser_download_url)'" -ForegroundColor White
    Write-Host "  `$out = `"`$env:USERPROFILE\Downloads\$($asset.name)`"" -ForegroundColor White
    Write-Host "  Invoke-WebRequest `$url -OutFile `$out" -ForegroundColor White
    Write-Host "  Unblock-File `$out" -ForegroundColor White
    Write-Host "  Start-Process `$out" -ForegroundColor White
    Write-Host ''
    Write-Host "[nels] When 'Windows protected your PC' appears, click 'More info' then 'Run anyway'." -ForegroundColor Yellow
}

try {
    Install-NeLS
} catch {
    # Swallow the thrown "install failed" marker — Write-Fail already printed
    # the diagnostic. Any other exception gets surfaced here so the user sees
    # why we bailed, but the session keeps running.
    if ($_.Exception.Message -ne 'install failed') {
        Write-Host "[nels] Unexpected error: $($_.Exception.Message)" -ForegroundColor Red
    }
}
