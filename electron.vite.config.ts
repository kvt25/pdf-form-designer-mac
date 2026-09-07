import { cpSync } from 'fs'
import { join, resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import { PDFJS_ASSET_DIRS } from './src/shared/pdfjsAssets'

function copyPdfjsAssets(): Plugin {
  return {
    name: 'copy-pdfjs-assets',
    apply: 'build',
    writeBundle(options) {
      const sourceRoot = resolve('node_modules/pdfjs-dist')
      const destRoot = join(options.dir ?? resolve('out/renderer'), 'pdfjs')
      for (const dir of PDFJS_ASSET_DIRS) {
        cpSync(join(sourceRoot, dir), join(destRoot, dir), { recursive: true })
      }
    }
  }
}

export default defineConfig({
  main: {},
  preload: {},
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [react(), copyPdfjsAssets()],
    optimizeDeps: {
      exclude: ['pdfjs-dist']
    }
  }
})
