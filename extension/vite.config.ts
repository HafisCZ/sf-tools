import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

const ROOT_DIRECTORY = fileURLToPath(new URL('..', import.meta.url))

export default defineConfig({
  root: path.join(ROOT_DIRECTORY, 'extension/popup'),
  base: './',
  publicDir: false,
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@library': path.join(ROOT_DIRECTORY, 'src/library'),
      '@utils': path.join(ROOT_DIRECTORY, 'src/utils'),
      '~': path.join(ROOT_DIRECTORY, 'src')
    }
  },
  build: {
    outDir: path.join(ROOT_DIRECTORY, 'extension/dist/popup'),
    emptyOutDir: false,
    rollupOptions: {
      input: path.join(ROOT_DIRECTORY, 'extension/popup/popup.html')
    }
  }
})
