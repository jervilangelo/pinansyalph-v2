import { expect, test, type Page } from '@playwright/test'
import { calculateMp2 } from '../src/calculators/mp2'
import { peso } from '../src/utils/format'
import { readFileSync } from 'node:fs'

// Read the published datasets directly (the same files the site bundles).
const load = (f: string) => JSON.parse(readFileSync(new URL(`../src/data/${f}`, import.meta.url), 'utf8'))
const inflationData = load('inflation.json')
const mp2Data = load('mp2.json')
const latestHeadline = inflationData.series.headline.at(-1) as { period: string; value: number }
const latestMp2 = [...mp2Data.rates].sort((a: { year: number }, b: { year: number }) => a.year - b.year).at(-1) as { rate: number }
const last5 = inflationData.annualHeadline.slice(-5) as { value: number }[]
const recentAverageInflation = { value: Math.round((last5.reduce((s, y) => s + y.value, 0) / last5.length) * 10) / 10 }

function trackErrors(page: Page) {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  return errors
}

async function settle(page: Page) {
  // Let count-up animations reach their final values.
  await page.waitForTimeout(1600)
}

test.describe('home page', () => {
  test('loads with title, indicators and no console errors', async ({ page }) => {
    const errors = trackErrors(page)
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Mas malinaw ang pera mo/i)
    await expect(page.getByRole('link', { name: 'Compute my take-home pay' })).toBeVisible()
    const numbers = page.locator('[aria-labelledby="numbers-title"]')
    await expect(numbers).toContainText('Inflation')
    await expect(numbers).toContainText('MP2 dividend')
    await expect(numbers).toContainText('PSA')
    // Never claims to be live
    await expect(page.locator('body')).not.toContainText(/\blive\b/i)
    await page.mouse.wheel(0, 20000)
    await page.waitForTimeout(800)
    expect(errors).toEqual([])
  })

  test('has SEO and social metadata', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/PinansyalPH/)
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /MP2/)
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /og-image\.png$/)
    await expect(page.locator('link[rel="icon"][type="image/svg+xml"]')).toHaveAttribute('href', /favicon\.svg$/)
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', /site\.webmanifest$/)
  })
})

test.describe('MP2 calculator', () => {
  test('shows the projection the calculator library computes for ₱5,000 a month', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/mp2')
    const startMonth = new Date().getMonth() + 1
    const expected = calculateMp2({
      initial: 0,
      contribution: 5000,
      frequency: 'monthly',
      years: 5,
      startMonth,
      dividendRatePct: latestMp2.rate,
      payout: 'compounded',
      inflationPct: recentAverageInflation.value,
      timing: 'mid',
    })
    await expect(page.getByTestId('mp2-maturity')).toHaveText(peso(expected.maturityValue))
    const results = page.locator('#mp2 dl')
    await expect(results).toContainText(peso(expected.totalContributed))
    await expect(results).toContainText(peso(expected.real.realEnding))
  })

  test('updates when the contribution changes and rejects invalid input', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/mp2')
    const monthly = page.getByLabel('Monthly contribution')
    await monthly.fill('10,000')
    await expect(page.locator('#mp2 dl')).toContainText('₱600,000')
    await monthly.fill('-50')
    await expect(page.locator('#mp2').getByRole('alert')).toHaveText(/cannot be negative/i)
    await monthly.fill('abc')
    await expect(page.locator('#mp2').getByRole('alert')).toHaveText(/Enter a number/i)
  })

  test('switches payout, rate source and flags hypothetical terms', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/mp2')
    await page.locator('#mp2').getByText('Annual payout', { exact: true }).click()
    await expect(page.locator('#mp2')).toContainText('paid out yearly')
    await page.locator('#mp2').getByText('Custom', { exact: true }).click()
    await expect(page.getByLabel('Your projected dividend rate')).toBeVisible()
    await expect(page.locator('#mp2')).toContainText('Your own assumption')
    await page.locator('#years').fill('10')
    await expect(page.locator('#mp2')).toContainText('Hypothetical')
  })

  test('real-value insight follows the numbers, not the title', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/mp2')
    const section = page.locator('#real-value')
    await page.getByLabel('Inflation assumption').first().selectOption('custom')
    await page.getByLabel('Your inflation estimate').first().fill('1')
    await expect(section).toContainText('outpaced inflation')
    await page.getByLabel('Your inflation estimate').first().fill('15')
    await expect(section).toContainText(/lost buying power/)
  })
})

test.describe('digital banks', () => {
  test('applies 20% tax and lets the user override the rate', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/banks')
    const banks = page.locator('#banks')
    await banks.getByLabel('Bank and product').selectOption('cimb-upsave')
    await expect(banks).toContainText('Withholding tax')
    await banks.getByLabel('Interest rate').fill('0')
    await expect(banks.locator('dl[data-ui]')).toContainText('₱0')
    await expect(banks).toContainText('Use the published rate again')
  })

  test('shows promo conditions only when a promo exists', async ({ page }) => {
    await page.goto('/banks')
    const banks = page.locator('#banks')
    await banks.getByLabel('Bank and product').selectOption('maya-savings')
    await expect(banks.getByRole('checkbox', { name: /Apply/ })).toBeVisible()
    await banks.getByLabel('Bank and product').selectOption('gotyme-goalsave')
    await expect(banks.getByRole('checkbox', { name: /Apply/ })).toHaveCount(0)
  })
})

test.describe('comparison, inflation and fuel', () => {
  test('comparison toggles products on and off', async ({ page }) => {
    await page.goto('/compare')
    const section = page.locator('#compare')
    const gotyme = section.getByRole('checkbox', { name: /GoTyme Bank GoalSave/ })
    await expect(gotyme).not.toBeChecked()
    await section.getByText('GoTyme Bank GoalSave').first().click()
    await expect(gotyme).toBeChecked()
    await expect(section.getByRole('checkbox', { name: /Time Deposit \(6 months\)/ })).toBeDisabled()
  })

  test('inflation section shows the latest PSA reference month', async ({ page }) => {
    await page.goto('/inflation')
    await expect(page.locator('#inflation-title')).toContainText(String(latestHeadline.period.slice(0, 4)))
    await expect(page.locator('#inflation .recharts-line-curve').first()).toBeAttached({ timeout: 10_000 })
  })

  test('fuel tabs work with the keyboard', async ({ page }) => {
    await page.goto('/gas')
    const diesel = page.getByRole('tab', { name: /Diesel/ })
    await expect(diesel).toHaveAttribute('aria-selected', 'true')
    await diesel.focus()
    await page.keyboard.press('ArrowDown')
    await expect(page.getByRole('tab', { name: /Kerosene/ })).toHaveAttribute('aria-selected', 'true')
    await expect(page.locator('#fuel-panel')).toContainText('Kerosene')
  })
})

test.describe('accessibility basics', () => {
  test('skip link is the first focusable element', async ({ page }) => {
    await page.goto('/')
    await page.keyboard.press('Tab')
    await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused()
  })

  test('every image has alt text and every input a label', async ({ page }) => {
    await page.goto('/')
    const missingAlt = await page.locator('img:not([alt])').count()
    expect(missingAlt).toBe(0)
    const unlabelled = await page.evaluate(() =>
      [...document.querySelectorAll('input:not([type=hidden]), select')].filter((el) => {
        const id = el.getAttribute('id')
        return !(id && document.querySelector(`label[for="${id}"]`)) && !el.closest('label') && !el.getAttribute('aria-label')
      }).length,
    )
    expect(unlabelled).toBe(0)
  })
})

const ROUTES = ['/', '/sweldo', '/underpaid-ba-ko', '/13th-month', '/mp2', '/banks', '/compare', '/inflation', '/gas', '/about']

test.describe('pages and navigation', () => {
  test('every route loads directly with its own heading and title', async ({ page }) => {
    const errors = trackErrors(page)
    for (const r of ROUTES) {
      await page.goto(r)
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
      if (r !== '/') await expect(page).toHaveTitle(/· PinansyalPH$/)
    }
    expect(errors).toEqual([])
  })

  test('the main menu moves between pages without a reload', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => ((window as unknown as { __spa: boolean }).__spa = true))
    const nav = page.getByRole('navigation', { name: 'Main' })
    const tools = nav.getByRole('button', { name: 'Tools' })
    await tools.click()
    await expect(tools).toHaveAttribute('aria-expanded', 'true')
    await page.locator('#tools-menu').getByRole('link', { name: /^MP2/ }).click()
    await expect(page).toHaveURL(/\/mp2$/)
    await expect(page.locator('#mp2-title')).toBeVisible()
    await expect(page.locator('#tools-menu')).toHaveCount(0)
    // The menu marks the current page when reopened, and Escape closes it and returns focus.
    await tools.click()
    await expect(page.locator('#tools-menu').getByRole('link', { name: /^MP2/ })).toHaveAttribute('aria-current', 'page')
    await page.keyboard.press('Escape')
    await expect(page.locator('#tools-menu')).toHaveCount(0)
    await expect(tools).toBeFocused()
    await nav.getByRole('link', { name: 'About', exact: true }).click()
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Financial literacy')
    await page.goBack()
    await expect(page.locator('#mp2-title')).toBeVisible()
    expect(await page.evaluate(() => (window as unknown as { __spa?: boolean }).__spa)).toBe(true)
  })

  test('mobile menu opens, navigates and closes', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    await page.getByRole('button', { name: 'Open menu' }).click()
    await expect(page.locator('#mobile-menu')).toBeVisible()
    await page.locator('#mobile-menu').getByRole('link', { name: /^Gas/ }).click()
    await expect(page).toHaveURL(/\/gas$/)
    await expect(page.locator('#mobile-menu')).toHaveCount(0)
    await expect(page.locator('#gas-title')).toBeVisible()
  })

  test('the about page explains the project and links to the source', async ({ page }) => {
    await page.goto('/about')
    await expect(page.locator('main')).toContainText('open source')
    await expect(page.locator('main')).toContainText('financial literacy')
    await expect(page.getByRole('link', { name: 'View the source on GitHub' })).toHaveAttribute('href', 'https://github.com/jervilangelo/pinansyalph-v2')
    await expect(page.locator('#faq')).toBeVisible()
  })
})

for (const width of [360, 390, 768, 1024, 1366, 1920]) {
  test(`no horizontal overflow at ${width}px on any page`, async ({ page }) => {
    test.setTimeout(90_000)
    const errors = trackErrors(page)
    await page.setViewportSize({ width, height: 900 })
    for (const route of ROUTES) {
      await page.goto(route)
      const height = await page.evaluate(() => document.body.scrollHeight)
      for (let y = 0; y < height; y += 700) {
        await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y)
        await page.waitForTimeout(40)
      }
      await settle(page)
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      expect(overflow, route).toBeLessThanOrEqual(0)
      // Nothing wider than the viewport except intentionally clipped display type
      const wide = await page.evaluate(() =>
        [...document.querySelectorAll('main *, body > div > div:first-of-type *')]
          .filter((el) => {
            const r = el.getBoundingClientRect()
            return r.width > 0 && (r.right > window.innerWidth + 1 || r.left < -1) && !el.closest('[aria-hidden="true"]') && getComputedStyle(el).position !== 'absolute'
          })
          .slice(0, 5)
          .map((el) => `${el.tagName}.${String(el.className).slice(0, 60)}`),
      )
      expect(wide, route).toEqual([])
    }
    expect(errors).toEqual([])
  })
}

test.describe('v3 brand and support', () => {
  test('the splash leaves on its own and never blocks the page', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('#splash')).toHaveCount(0, { timeout: 6000 })
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    // A reload in the same tab skips the long intro.
    await page.reload()
    await expect(page.locator('html')).toHaveClass(/splash-quick/)
    await expect(page.locator('#splash')).toHaveCount(0, { timeout: 3000 })
  })

  test('nested routes load directly after a refresh', async ({ page }) => {
    await page.goto('/13th-month')
    await page.reload()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Magkano Ang 13th Month Pay Mo?')
    await expect(page.locator('img[alt="PinansyalPH"]').first()).toBeVisible()
  })

  test('home estimator hands its salary to the sweldo calculator', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    await page.getByLabel('Monthly basic salary').fill('45,000')
    await expect(page.getByTestId('quick-take-home')).not.toHaveText('₱26,543')
    const quick = await page.getByTestId('quick-take-home').textContent()
    await page.getByRole('link', { name: 'Full breakdown' }).click()
    await expect(page).toHaveURL(/\/sweldo\?basic=45000$/)
    await expect(page.locator('#sweldo').getByLabel('Basic monthly salary')).toHaveValue('45,000')
    await expect(page.getByTestId('take-home')).toHaveText(quick!)
  })

  test('support modal: focus, links, Escape and focus restore', async ({ page }) => {
    await page.goto('/about')
    await expect(page.locator('#splash')).toHaveCount(0, { timeout: 6000 })
    const trigger = page.getByRole('button', { name: 'Ways to support' })
    await trigger.click()
    const dialog = page.getByRole('dialog', { name: 'Support PinansyalPH' })
    await expect(dialog).toBeVisible()
    const star = dialog.getByRole('link', { name: /Star on GitHub/ })
    await expect(star).toBeFocused()
    await expect(star).toHaveAttribute('href', 'https://github.com/jervilangelo/pinansyalph-v2')
    await expect(star).toHaveAttribute('target', '_blank')
    await expect(dialog.getByRole('link', { name: /View Developer Portfolio/ })).toHaveAttribute('href', 'https://jervilangelo.online/')
    // Focus stays inside the dialog.
    for (let i = 0; i < 6; i++) await page.keyboard.press('Tab')
    expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true)
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await expect(trigger).toBeFocused()
    // The close button works too.
    await trigger.click()
    await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })

  test('support modal opens from the phone menu and fits the screen', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 })
    await page.goto('/')
    await page.getByRole('button', { name: 'Open menu' }).click()
    await page.locator('#mobile-menu').getByRole('button', { name: 'Support PinansyalPH' }).click()
    const dialog = page.getByRole('dialog', { name: 'Support PinansyalPH' })
    await expect(dialog).toBeVisible()
    const box = await dialog.boundingBox()
    expect(box!.width).toBeLessThanOrEqual(360)
    await expect(dialog.getByRole('link', { name: /Star on GitHub/ })).toBeInViewport()
  })
})
