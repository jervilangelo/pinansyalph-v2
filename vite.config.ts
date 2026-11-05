/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { copyFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'

/** Keep in sync with ROUTES in src/router.tsx. */
const ROUTES = ['sweldo', 'mp2', 'banks', 'compare', 'inflation', 'gas', 'about']

/**
 * GitHub Pages has no rewrite rules, so give every route its own copy of
 * index.html (served with a 200), and a 404.html for anything else.
 */
function pagesRoutes(): Plugin {
  let outDir = 'dist'
  return {
    name: 'pages-routes',
    apply: 'build',
    configResolved(c) {
      outDir = resolve(c.root, c.build.outDir)
    },
    closeBundle() {
      const index = resolve(outDir, 'index.html')
      for (const r of ROUTES) {
        mkdirSync(resolve(outDir, r), { recursive: true })
        copyFileSync(index, resolve(outDir, r, 'index.html'))
      }
      copyFileSync(index, resolve(outDir, '404.html'))
    },
  }
}

// GitHub Pages serves this project at /<repo>/ unless a custom domain is set.
// BASE_PATH lets CI choose; local dev uses '/'.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), tailwindcss(), pagesRoutes()],
  build: { chunkSizeWarningLimit: 600 },
  test: {
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
    environment: 'node',
  },
})
