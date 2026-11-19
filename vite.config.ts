/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import en from './src/i18n/en.json' with { type: 'json' }
import { PAGES, ROUTES, SITE_ORIGIN, canonicalUrl } from './src/routes.ts'

const SITE_NAME = 'PinansyalPH'
/** Static HTML is in English, the site's default language (the app switches it in the browser). */
const en_ = en as Record<string, string>
const inEnglish = (s: string) => en_[s] ?? s

const escapeAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Replace the content/href of one head tag, failing the build if the tag is missing. */
function setTag(html: string, pattern: RegExp, value: string, what: string): string {
  if (!pattern.test(html)) throw new Error(`pages-routes: ${what} not found in index.html`)
  return html.replace(pattern, (_m, before: string, after: string) => `${before}${escapeAttr(value)}${after}`)
}

/** index.html with the title, description and URLs of one route. */
function headFor(html: string, path: string, title: string, description: string): string {
  const url = canonicalUrl(path)
  let out = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeAttr(title)}</title>`)
  out = setTag(out, /(<meta\s+name="description"\s+content=")[^"]*(")/, description, 'meta description')
  out = setTag(out, /(<link rel="canonical" href=")[^"]*(")/, url, 'canonical link')
  out = setTag(out, /(<meta property="og:url" content=")[^"]*(")/, url, 'og:url')
  out = setTag(out, /(<meta property="og:title" content=")[^"]*(")/, title, 'og:title')
  out = setTag(out, /(<meta property="og:description" content=")[^"]*(")/, description, 'og:description')
  out = setTag(out, /(<meta name="twitter:title" content=")[^"]*(")/, title, 'twitter:title')
  out = setTag(out, /(<meta name="twitter:description" content=")[^"]*(")/, description, 'twitter:description')
  return out
}

/**
 * GitHub Pages has no rewrite rules, so every route gets static files:
 *
 * - /<route>.html is what GitHub Pages serves for the clean URL /<route>, with a 200 and no redirect.
 * - /<route>/index.html keeps old trailing-slash links (/<route>/) loading; the app then rewrites them to /<route>.
 * - /404.html (noindex) serves the app for anything else, including the old /pinansyalph-v2/... paths.
 *
 * Each copy carries its own title, description, canonical and Open Graph tags, so link previews
 * and crawlers see the right page before any JavaScript runs. Also writes sitemap.xml and robots.txt.
 */
function pagesRoutes(): Plugin {
  let outDir = 'dist'
  let building = false
  return {
    name: 'pages-routes',
    configResolved(c) {
      outDir = resolve(c.root, c.build.outDir)
      building = c.command === 'build' && !c.build.ssr
    },
    transformIndexHtml: {
      order: 'pre',
      handler: (html) => html.replaceAll('%SITE_URL%', `${SITE_ORIGIN}/`),
    },
    closeBundle() {
      if (!building) return
      const indexPath = resolve(outDir, 'index.html')
      let index: string
      try {
        index = readFileSync(indexPath, 'utf8')
      } catch {
        return // dev server or a failed build: nothing to write
      }

      for (const page of PAGES) {
        const html = headFor(index, page.path, `${inEnglish(page.title)} · ${SITE_NAME}`, inEnglish(page.blurb))
        const slug = page.path.slice(1)
        writeFileSync(resolve(outDir, `${slug}.html`), html)
        mkdirSync(resolve(outDir, slug), { recursive: true })
        writeFileSync(resolve(outDir, slug, 'index.html'), html)
      }

      const notFound = index
        .replace(/\s*<link rel="canonical" href="[^"]*" \/>/, '')
        .replace('<meta name="viewport"', '<meta name="robots" content="noindex" />\n    <meta name="viewport"')
      writeFileSync(resolve(outDir, '404.html'), notFound)

      const today = new Date().toISOString().slice(0, 10)
      const urls = ROUTES.map((r) => `  <url>\n    <loc>${canonicalUrl(r)}</loc>\n    <lastmod>${today}</lastmod>\n  </url>`).join('\n')
      writeFileSync(resolve(outDir, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`)
      writeFileSync(resolve(outDir, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE_ORIGIN}/sitemap.xml\n`)
    },
  }
}

// The site is served from the root of its custom domain, https://pinansyalph.site/.
// BASE_PATH can still override it (for example, to preview a build under a subfolder).
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), tailwindcss(), pagesRoutes()],
  build: { chunkSizeWarningLimit: 600 },
  test: {
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
    environment: 'node',
  },
})
