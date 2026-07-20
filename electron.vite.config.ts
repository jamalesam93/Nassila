import { cpSync, existsSync, mkdirSync } from 'fs'
import { resolve, join } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'

/** Native / worker assets that must not be Rollup-bundled (see electron-vite dependency handling). */
export const MAIN_NATIVE_EXTERNALS = ['canvas', '@napi-rs/canvas', 'tesseract.js', 'tesseract.js-core'] as const

function copyAppIcons(): Plugin {
  return {
    name: 'copy-app-icons',
    buildStart() {
      copyIcons()
    },
    closeBundle() {
      copyIcons()
    }
  }
}

function copyIcons(): void {
  const root = resolve(__dirname)
  const dest = join(root, 'out/main/assets')
  mkdirSync(dest, { recursive: true })
  for (const name of ['icon.png', 'icon.ico']) {
    const src = join(root, 'build', name)
    if (existsSync(src)) cpSync(src, join(dest, name))
  }
}

export default defineConfig({
  main: {
    plugins: [copyAppIcons()],
    build: {
      // Bundle JS deps into out/** for portable packaging, but keep Node addons external —
      // bundling canvas breaks CJS/.node interop and drops Windows Cairo companion DLLs.
      externalizeDeps: false,
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/main/index.ts')
        },
        external: [...MAIN_NATIVE_EXTERNALS]
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/preload/index.ts')
        }
      }
    }
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/renderer/index.html')
        }
      }
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@renderer': resolve(__dirname, 'src/renderer'),
        '@engine': resolve(__dirname, 'src/engine')
      }
    }
  }
})
