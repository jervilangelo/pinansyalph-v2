import { expect, test, type Page } from '@playwright/test'
import { ROUTES } from '../src/routes'

/**
 * Settings: language (English default, Filipino, Bisaya), appearance (light
 * default, dark), privacy and about. These tests start from a clean browser,
 * unlike the other specs, which run in English.
 */
test.use({ storageState: { cookies: [], origins: [] } })

const TAGLINE = 'Tamang Pinansyal para sa mga Pilipino.'

async function ready(page: Page) {
  await expect(page.locator('#splash')).toHaveCount(0, { timeout: 8000 })
}

async function openSettings(page: Page) {
  const wide = (page.viewportSize()?.width ?? 1280) >= 1024
  await page.getByTestId(wide ? 'settings-button' : 'settings-button-mobile').click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByTestId('settings')).toBeVisible()
  return dialog
}

test.describe('language', () => {
  test('English is the default, and the tagline is the official one', async ({ page }) => {
    await page.goto('/')
    await ready(page)
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-PH')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(new RegExp(TAGLINE.replace('.', '\\.')))
    await expect(page.getByRole('heading', { name: 'What do you want to know?' })).toBeVisible()
    await expect(page).toHaveTitle(`PinansyalPH: ${TAGLINE}`)
  })

  test('switching language translates the whole site at once and is remembered', async ({ page }) => {
    await page.goto('/sweldo')
    await ready(page)
    const dialog = await openSettings(page)
    await expect(dialog.getByRole('heading', { name: 'Settings' })).toBeVisible()

    await dialog.getByText('Filipino', { exact: true }).click()
    await expect(dialog.getByRole('heading', { name: 'Mga Setting' })).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('lang', 'fil')

    await dialog.getByText('Bisaya', { exact: true }).click()
    await expect(dialog.getByRole('heading', { name: 'Mga Setting' })).toBeVisible()
    await expect(dialog.getByRole('heading', { name: 'Pinulongan' })).toBeVisible({ timeout: 15_000 })
    await expect(dialog.getByRole('heading', { name: 'Mahitungod sa PinansyalPH' })).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('lang', 'ceb')
    await page.keyboard.press('Escape')

    await page.reload()
    await ready(page)
    await expect(page.locator('html')).toHaveAttribute('lang', 'ceb', { timeout: 15_000 })
    await expect(page.locator('#sweldo').getByLabel('Basic salary kada bulan')).toBeVisible({ timeout: 15_000 })
  })

  test('changing language keeps calculator inputs and results', async ({ page }) => {
    await page.goto('/sweldo')
    await ready(page)
    const salary = page.locator('#sweldo').getByLabel('Basic monthly salary')
    await salary.fill('52000')
    await salary.blur()
    const figures = async () => Promise.all(['take-home', 'remaining'].map(async (id) => (await page.getByTestId(id).innerText()).match(/₱[\d,]+(\.\d\d)?/g)))
    const before = await figures()
    expect(before[0]?.length).toBeGreaterThan(0)
    const dialog = await openSettings(page)
    await dialog.getByText('Filipino', { exact: true }).click()
    await page.keyboard.press('Escape')
    await expect(page.locator('#sweldo').getByLabel('Buwanang basic salary')).toHaveValue('52,000')
    expect(await figures()).toEqual(before)
  })

  test('validation messages from the calculators are translated', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('pinansyalph-language', 'fil'))
    await page.goto('/mp2')
    await ready(page)
    const monthly = page.getByLabel('Buwanang hulog')
    await monthly.fill('-5')
    await monthly.blur()
    await expect(page.locator('main')).toContainText('Hindi puwedeng negatibo')
  })

  for (const [lang, text] of [
    ['en', 'Settings'],
    ['fil', 'Mga Setting'],
    ['ceb', 'Mga Setting'],
  ] as const) {
    test(`every page renders in ${lang} with no untranslated placeholder keys`, async ({ page }) => {
      test.setTimeout(120_000)
      await page.addInitScript((l) => localStorage.setItem('pinansyalph-language', l), lang)
      for (const r of ROUTES) {
        await page.goto(r)
        await expect(page.locator('h1').first()).toBeVisible({ timeout: 15_000 })
        const body = await page.locator('body').innerText()
        // A leaked key would show its {placeholder}.
        expect(body, r).not.toMatch(/\{[a-zA-Z]\w*\}/)
        expect(body, r).not.toMatch(/open[- ]?source/i)
      }
      const dialog = await openSettings(page)
      await expect(dialog.getByRole('heading', { level: 2 })).toHaveText(text)
    })
  }
})

test.describe('appearance', () => {
  test('light is the default; dark is applied, remembered and restored before first paint', async ({ page }) => {
    await page.goto('/')
    await ready(page)
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    const dialog = await openSettings(page)
    await dialog.getByText('Dark Mode').click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
    expect(bg).toBe('rgb(24, 25, 27)')
    await page.keyboard.press('Escape')

    // On reload the theme is set by the inline head script, before the app runs.
    await page.route('**/assets/*.js', async (route) => {
      await new Promise((r) => setTimeout(r, 300))
      await route.continue()
    })
    await page.goto('/', { waitUntil: 'commit' })
    await page.waitForSelector('html[data-theme]', { state: 'attached' })
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark')
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)).toBe('rgb(24, 25, 27)')
    await ready(page)
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  })

  test('dark mode keeps text, inputs and charts readable', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('pinansyalph-theme', 'dark'))
    await page.goto('/inflation')
    await ready(page)
    const ratio = await page.evaluate(() => {
      const lum = (c: string) => {
        const [r, g, b] = (c.match(/\d+(\.\d+)?/g) ?? []).slice(0, 3).map(Number).map((v) => {
          const s = v / 255
          return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
        })
        return 0.2126 * r + 0.7152 * g + 0.0722 * b
      }
      const contrast = (a: string, b: string) => {
        const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
        return (x + 0.05) / (y + 0.05)
      }
      const body = getComputedStyle(document.body)
      const tick = document.querySelector('.recharts-cartesian-axis-tick-value')
      const tickFill = tick ? getComputedStyle(tick).fill : body.color
      return { text: contrast(body.color, body.backgroundColor), tick: contrast(tickFill, body.backgroundColor) }
    })
    expect(ratio.text).toBeGreaterThan(12)
    expect(ratio.tick).toBeGreaterThan(4.5)
  })

  for (const width of [375, 390, 768, 1024, 1440]) {
    test(`dark mode and settings fit at ${width}px`, async ({ page }) => {
      test.setTimeout(120_000)
      await page.setViewportSize({ width, height: 860 })
      await page.addInitScript(() => localStorage.setItem('pinansyalph-theme', 'dark'))
      for (const r of ROUTES) {
        await page.goto(r)
        await expect(page.locator('h1').first()).toBeVisible({ timeout: 15_000 })
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
        expect(overflow, r).toBeLessThanOrEqual(0)
      }
      await ready(page)
      const dialog = await openSettings(page)
      const box = await dialog.boundingBox()
      expect(box!.width).toBeLessThanOrEqual(width)
      const inner = await dialog.evaluate((d) => d.scrollWidth - d.clientWidth)
      expect(inner).toBeLessThanOrEqual(0)
    })
  }
})

test.describe('privacy, about and branding', () => {
  test('settings show the privacy statement, about, contact and portfolio in each language', async ({ page }) => {
    await page.goto('/')
    await ready(page)
    const dialog = await openSettings(page)
    await dialog.getByText('Filipino', { exact: true }).click()
    await expect(dialog.getByTestId('privacy-text')).toHaveText(
      'Pribado ang iyong financial information. Walang personal o financial data na sine-save sa aming server. Lahat ng kalkulasyon ay ginagawa sa iyong browser. Walang account, signup, o login na kailangan.',
    )
    await expect(dialog.getByTestId('settings-tagline')).toHaveText(TAGLINE)
    await expect(dialog).toContainText('Jervil Angelo De Leon')
    await expect(dialog.getByRole('link', { name: /jervilangelo\.online/ })).toHaveAttribute('href', 'https://jervilangelo.online/')
    await expect(dialog.getByRole('link', { name: /deleonangelojervil@gmail\.com/ })).toHaveAttribute('href', 'mailto:deleonangelojervil@gmail.com')
    await expect(dialog.getByRole('link', { name: /pinansyalph\.site/ })).toHaveAttribute('href', 'https://pinansyalph.site/')

    await dialog.getByText('English', { exact: true }).click()
    await expect(dialog.getByTestId('privacy-text')).toHaveText(
      'Your financial information stays private. No personal or financial data is stored on our servers. All calculations are performed directly in your browser. No account, signup, or login is required.',
    )
    await dialog.getByText('Bisaya', { exact: true }).click()
    await expect(dialog.getByTestId('privacy-text')).toHaveText(
      'Pribado ang imong financial information. Walay personal o financial data nga gi-save sa among server. Ang tanang kalkulasyon gihimo direkta sa imong browser. Dili kinahanglan og account, signup, o login.',
    )
    await expect(dialog.getByTestId('settings-tagline')).toHaveText(TAGLINE)
  })

  test('footer shows the copyright line and the tagline; old tagline is gone', async ({ page }) => {
    await page.goto('/about')
    await ready(page)
    await expect(page.getByTestId('copyright')).toHaveText('© 2026 PinansyalPH. All rights reserved.')
    await expect(page.locator('footer')).toContainText(TAGLINE)
    await expect(page.locator('body')).not.toContainText('Mas malinaw ang pera mo')
    await expect(page.locator('body')).not.toContainText(/open[- ]?source/i)
  })

  test('settings are keyboard accessible', async ({ page }) => {
    await page.goto('/')
    await ready(page)
    await page.getByTestId('settings-button').focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByTestId('settings')).toBeVisible()
    await page.getByTestId('language-en').focus()
    await page.keyboard.press('ArrowRight')
    await expect(page.locator('html')).toHaveAttribute('lang', 'fil')
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await expect(page.getByTestId('settings-button')).toBeFocused()
  })

  test('invalid saved preferences fall back to the defaults', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('pinansyalph-language', 'klingon')
      localStorage.setItem('pinansyalph-theme', 'neon')
    })
    await page.goto('/')
    await ready(page)
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-PH')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  })
})
