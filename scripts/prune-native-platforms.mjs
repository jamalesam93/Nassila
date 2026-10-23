/**
 * Prune onnxruntime-node's per-platform native binaries down to the platform/arch being
 * packaged. Wired as both beforePack and afterPack.
 *
 * WHY THIS EXISTS
 * onnxruntime-node ships five prebuilt slices. The common `files` list matches the whole
 * onnxruntime-node directory, so every build carried every slice — on a Windows x64 build
 * that is ~219 MB of darwin / linux / win32-arm64 binaries that can never load. The runtime
 * resolves exactly one of them, by platform and arch:
 *   bin/napi-v6/<process.platform>/<process.arch>/onnxruntime_binding.node
 * (see onnxruntime-node/dist/binding.js).
 *
 * WHY NOT A NEGATION IN win.files / mac.files / linux.files
 * Putting negations in a platform-specific `files` block makes electron-builder's
 * defaultMatcher hold only ignore patterns. getMainFileMatchers() then takes the
 * containsOnlyIgnore() branch in app-builder-lib/out/fileMatcher.js and prepends a
 * match-everything glob, which packs the ENTIRE repository (docs/, src/, tests/, .cursor/)
 * into app.asar — measured at +174.6 MB. Platform-specific `files` is therefore unusable
 * for this prune, and a platform-neutral negation would strip the slice macOS and Linux
 * builds need.
 *
 * WHY beforePack AND afterPack
 * beforePack runs before the asar is built and before asar integrity is computed
 * (app-builder-lib/out/platformPackager.js: emitBeforePack, then integrity computeData,
 * then emitAfterPack). The packaged tree and its recorded hashes therefore already exclude
 * these files — nothing is deleted from an already-hashed package. afterPack moves the
 * staged slices back, so the developer tree is left exactly as it was found.
 *
 * Both hooks are idempotent: beforePack restores first, so a build that dies mid-way cannot
 * leave the tree permanently pruned, and `npm install` restores it regardless.
 */
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs'
import { join } from 'node:path'

/** builder-util Arch enum -> onnxruntime-node / process.arch directory name. */
const ARCH_DIR = { 0: 'ia32', 1: 'x64', 2: 'arm', 3: 'arm64', 4: 'universal' }

function paths(context) {
  const projectDir = context?.packager?.projectDir ?? process.cwd()
  return {
    binDir: join(projectDir, 'node_modules', 'onnxruntime-node', 'bin', 'napi-v6'),
    staging: join(projectDir, 'node_modules', '.nassila-pruned-ort')
  }
}

/** Move every staged slice back into place. Safe to call any number of times. */
function restore(staging, binDir) {
  if (!existsSync(staging)) return 0
  let restored = 0
  for (const p of readdirSync(staging)) {
    for (const a of readdirSync(join(staging, p))) {
      const target = join(binDir, p, a)
      if (!existsSync(target)) {
        mkdirSync(join(binDir, p), { recursive: true })
        renameSync(join(staging, p, a), target)
        restored += 1
      }
    }
  }
  rmSync(staging, { recursive: true, force: true })
  return restored
}

export async function beforePack(context) {
  const { binDir, staging } = paths(context)
  if (!existsSync(binDir)) {
    console.log('[prune-native-platforms] onnxruntime-node bin/napi-v6 absent; skipping')
    return
  }

  // Undo anything a previous run staged (self-heals across platforms).
  restore(staging, binDir)

  const platform = context?.electronPlatformName
  const arch = ARCH_DIR[context?.arch] ?? (typeof context?.arch === 'string' ? context.arch : undefined)
  if (!platform || !arch || !existsSync(join(binDir, platform))) {
    console.log(`[prune-native-platforms] unrecognised target (${platform ?? '?'}/${arch ?? '?'}); leaving tree intact`)
    return
  }

  mkdirSync(staging, { recursive: true })
  let staged = 0
  for (const p of readdirSync(binDir)) {
    for (const a of readdirSync(join(binDir, p))) {
      if (p === platform && a === arch) continue
      mkdirSync(join(staging, p), { recursive: true })
      renameSync(join(binDir, p, a), join(staging, p, a))
      staged += 1
    }
  }
  console.log(`[prune-native-platforms] keeping ${platform}/${arch}; staged ${staged} unused slice(s)`)
}

export async function afterPack(context) {
  const { binDir, staging } = paths(context)
  const restored = restore(staging, binDir)
  if (restored > 0) {
    console.log(`[prune-native-platforms] restored ${restored} slice(s) to the source tree`)
  }
}
