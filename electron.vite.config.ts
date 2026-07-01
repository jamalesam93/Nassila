import { cpSync, existsSync, mkdirSync } from 'fs'
import { resolve, join } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'

function copyAppIcons(): Plugin {
  return {
    name: 'copy-app-icons',
    closeBundle() {
      const root = resolve(__dirname)
      const dest = join(root, 'out/main/assets')
      mkdirSync(dest, { recursive: true })
      for (const name of ['icon.png', 'icon.ico']) {
        const src = join(root, 'build', name)
        if (existsSync(src)) cpSync(src, join(dest, name))
      }
    }
  }
}

export default defineConfig({
  main: {
    plugins: [copyAppIcons()],
    build: {
      // Default is true; portable/win build only ships out/** (no node_modules).
      externalizeDeps: false,
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/main/index.ts')
        }
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
