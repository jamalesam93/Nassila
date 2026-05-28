/// <reference types="vite/client" />

import type { ElectronApi } from '../preload/index'

declare global {
  interface Window {
    api: ElectronApi
  }
}
