import { expect, test, type Page } from '@playwright/test'
import { ROUTES } from '../src/routes'

/**
 * Custom domain and clean URLs: every route loads directly, survives a
 * refresh, has the right canonical URL, and old spellings land on the clean one.
 */

const ORIGIN = 'https://pinansyalph.site'
const canonical = (r: string) => (r === '/' ? `${ORIGIN}/` : `${ORIGIN}${r}`)

/** Collect console errors and failed same-origin requests while a test runs. */
function watch(page: Page) {
  const problems: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(`console: ${m.text()}`)
  })
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`))
  page.on('response', (r) => {
    const u = new URL(r.url())
    if (u.hostname === 'localhost' && r.status() >= 400) problems.push(`${r.status()} ${u.pathname}`)
  })
  page.on('requestfailed', (r) => {
    if (new URL(r.url()).hostname === 'localhost') problems.push(`failed ${r.url()}`)
  })
  return problems
}

test.describe('clean URLs', () => {
  for (const route of ROUTES) {
    test(`${route} loads directly, refreshes, and is canonical`, async ({ page }) => {
      const problems = watch(page)
      const res = await page.goto(route)
      expect(res?.status()).toBe(200)
      await expect(page.locator('h1').first()).toBeVisible()
      await expect(page).toHaveURL(new RegExp(`${route === '/' ? '/' : route}$`))
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', canonical(route))
      await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', canonical(route))

      await page.reload()
      await expect(page.locator('h1').first()).toBeVisible()
      await expect(page).toHaveURL(new RegExp(`${route === '/' ? '/' : route}$`))
      expect(problems).toEqual([])
    })
  }

  test('the server HTML for each route carries its own canonical before JavaScript runs', async ({ request }) => {
    for (const route of ROUTES) {
      const html = await (await request.get(route)).text()
      expect(html, route).toContain(`<link rel="canonical" href="${canonical(route)}" />`)
      expect(html, route).not.toMatch(/pinansyalph-v2\/|github\.io/)
    }
  })

  for (const [from, to] of [
    ['/mp2/', '/mp2'],
    ['/mp2.html', '/mp2'],
    ['/mp2/index.html', '/mp2'],
    ['/pinansyalph-v2/mp2', '/mp2'],
    ['/pinansyalph-v2/', '/'],
    ['/13th-month/?x=1#faq', '/13th-month?x=1#faq'],
  ]) {
    test(`${from} is rewritten to ${to}`, async ({ page }) => {
      await page.goto(from)
      await expect(page.locator('h1').first()).toBeVisible()
      const u = new URL(page.url())
      expect(u.pathname + u.search + u.hash).toBe(to)
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', canonical(to.split(/[?#]/)[0]))
    })
  }

  test('back and forward move between clean URLs', async ({ page }) => {
    await page.goto('/')
    // The footer link: the homepage's floating tool marks are always moving.
    await page.locator('footer a[href="/mp2"]').first().click()
    await expect(page).toHaveURL(/\/mp2$/)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${ORIGIN}/mp2`)
    await page.goBack()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${ORIGIN}/`)
    await page.goForward()
    await expect(page).toHaveURL(/\/mp2$/)
  })

  test('internal links use clean root-relative URLs', async ({ page }) => {
    await page.goto('/')
    const hrefs = await page.locator('a[href^="/"]').evaluateAll((as) => as.map((a) => a.getAttribute('href') ?? ''))
    expect(hrefs.length).toBeGreaterThan(10)
    for (const h of hrefs) {
      expect(h).not.toMatch(/\.html|pinansyalph-v2/)
      expect(h.split(/[?#]/)[0]).not.toMatch(/.\/$/)
    }
  })
})

test.describe('custom domain files', () => {
  test('CNAME, robots.txt and sitemap.xml are published', async ({ request }) => {
    expect((await (await request.get('/CNAME')).text()).trim()).toBe('pinansyalph.site')

    const robots = await (await request.get('/robots.txt')).text()
    expect(robots).toContain(`Sitemap: ${ORIGIN}/sitemap.xml`)

    const sitemap = await (await request.get('/sitemap.xml')).text()
    const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
    expect(locs.sort()).toEqual(ROUTES.map(canonical).sort())
  })

  test('the manifest is scoped to the domain root and its icons load', async ({ request }) => {
    const m = await (await request.get('/site.webmanifest')).json()
    expect(m.start_url).toBe('/')
    expect(m.scope).toBe('/')
    for (const icon of m.icons) expect((await request.get(`/${icon.src}`)).status(), icon.src).toBe(200)
  })

  test('social preview tags point at the custom domain', async ({ page, request }) => {
    await page.goto('/sweldo')
    for (const sel of ['meta[property="og:image"]', 'meta[name="twitter:image"]']) {
      await expect(page.locator(sel)).toHaveAttribute('content', `${ORIGIN}/og-image.png`)
    }
    expect((await request.get('/og-image.png')).status()).toBe(200)
    const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? '{}')
    expect(ld.url).toBe(`${ORIGIN}/`)
  })
})
