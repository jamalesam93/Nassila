/**
 * Embed Windows app icon via rcedit when signAndEditExecutable is false.
 * electron-builder afterPack hook — see electron-builder.yml
 */
import { existsSync } from 'node:fs'
import { join } from 'node:path'

/** @param {import('app-builder-lib').AfterPackContext} context */
export default async function winAfterPack(context) {
  if (context.electronPlatformName !== 'win32') return

  const { packager, appOutDir } = context
  const exe = join(appOutDir, `${packager.appInfo.productFilename}.exe`)

  let iconPath = null
  try {
    iconPath = await packager.getIconPath()
  } catch {
    // fall through to candidate paths below
  }

  const projectDir = packager.projectDir
  const buildResources = packager.info.buildResourcesDir ?? join(projectDir, 'build')
  const outputDir = join(projectDir, packager.config.directories?.output ?? 'dist')
  const candidates = [
    iconPath,
    join(outputDir, '.icon-ico', 'icon.ico'),
    join(buildResources, 'icon.ico')
  ].filter(Boolean)
  iconPath = candidates.find((p) => existsSync(p))

  if (!existsSync(exe) || !iconPath) return

  const rcedit = (await import('rcedit')).default ?? (await import('rcedit'))
  await rcedit(exe, { icon: iconPath })
}
