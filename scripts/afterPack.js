// Ad-hoc codesign the packed .app on macOS.
//
// Gatekeeper on Apple Silicon rejects unsigned binaries carrying the
// quarantine attribute with "NeLS is damaged and cannot be opened". An
// ad-hoc signature (identity "-") replaces that with the friendlier
// "unverified developer" warning users can right-click past. It's not a
// substitute for a Developer ID + notarization, but it's free and meaningfully
// better UX for internal distribution.
//
// Wired in via `afterPack` in electron-builder.yml.
const { execFileSync } = require('child_process')
const path = require('path')
const fs = require('fs')

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return
  const appName = `${context.packager.appInfo.productFilename}.app`
  const appPath = path.join(context.appOutDir, appName)
  if (!fs.existsSync(appPath)) {
    console.warn(`[afterPack] ${appPath} not found; skipping ad-hoc sign`)
    return
  }
  try {
    console.log(`[afterPack] ad-hoc signing ${appPath}`)
    execFileSync('codesign', ['--force', '--deep', '--sign', '-', appPath], { stdio: 'inherit' })
    execFileSync('codesign', ['--verify', '--deep', '--strict', appPath], { stdio: 'inherit' })
  } catch (err) {
    // Don't hard-fail the build — unsigned is still usable via xattr workaround.
    console.warn(`[afterPack] ad-hoc codesign failed: ${err.message}`)
  }
}
