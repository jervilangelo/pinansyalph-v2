import { expect, test, type Page } from '@playwright/test'

/** 13th month pay calculator ("Magkano Ang 13th Month Pay Mo?"). */

const total = (page: Page) => page.getByTestId('thirteenth-total')
const year = new Date().getFullYear()
const lastYear = String(year - 1)

function trackErrors(page: Page) {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  return errors
}

async function setDate(page: Page, label: string | RegExp, value: string) {
  await page.getByLabel(label).fill(value)
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/13th-month')
})

test('page heading, menu item and default full-year result', async ({ page }) => {
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Magkano Ang 13th Month Pay Mo?')
  await expect(page.locator('main')).toContainText('Calculate your estimated 13th-month pay based on Philippine labor laws.')
  await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: '13th Month Pay' })).toHaveAttribute('aria-current', 'page')
  // Employed since two years ago, ₱25,000: the full year totals one month of salary.
  await expect(total(page)).toHaveText('₱25,000.00')
})

test('Example A: six fully paid months at ₱25,000 → ₱12,500', async ({ page }) => {
  await page.getByLabel('Calculation year').selectOption(lastYear)
  await setDate(page, 'Employment start date', `${lastYear}-07-01`)
  await expect(total(page)).toHaveText('₱12,500.00')
  await expect(page.locator('#breakdown-title')).toBeVisible()
})

test('Example B: ₱20,000 Jan–Jun then ₱25,000 Jul–Dec → ₱22,500', async ({ page }) => {
  await page.getByLabel('Calculation year').selectOption(lastYear)
  await page.getByLabel('Monthly basic salary').fill('20,000')
  await page.getByRole('button', { name: /Advanced calculator/ }).click()
  await page.getByRole('button', { name: 'Add a salary change' }).click()
  await page.getByLabel('Starting', { exact: true }).selectOption('7')
  await page.getByLabel('New monthly basic salary').fill('25,000')
  await expect(total(page)).toHaveText('₱22,500.00')
})

test('resignation prorates and is labelled as separated', async ({ page }) => {
  await page.getByLabel('Calculation year').selectOption(lastYear)
  await setDate(page, /Employment end date/, `${lastYear}-05-31`)
  await expect(total(page)).toHaveText('₱10,416.67')
  await expect(page.locator('main')).toContainText('Separated: prorated')
  await page.getByRole('button', { name: /Clear end date/ }).click()
  await expect(total(page)).toHaveText('₱25,000.00')
})

test('invalid dates show a clear error instead of a result', async ({ page }) => {
  await setDate(page, 'Employment start date', `${year}-06-01`)
  await setDate(page, /Employment end date/, `${year}-05-01`)
  await expect(page.locator('#thirteenth').getByRole('alert')).toHaveText(/End date cannot be before the start date/)
})

test('unpaid absences, previous payment and the tax ceiling', async ({ page }) => {
  await page.getByLabel('Calculation year').selectOption(lastYear)
  await page.getByRole('button', { name: /Advanced calculator/ }).click()
  await page.getByRole('button', { name: /^March/ }).click()
  await page.getByLabel('March: unpaid absences deducted').fill('1,200')
  await expect(total(page)).toHaveText('₱24,900.00')
  await page.getByLabel('13th month pay already received this year').fill('12,000')
  await expect(page.getByTestId('remaining-entitlement')).toHaveText('₱12,900.00')
  // Other benefits push the total over ₱90,000: 24,900 + 70,000 = 94,900.
  await page.getByLabel('Other qualifying benefits this year').fill('70,000')
  await expect(page.getByTestId('potentially-taxable')).toHaveText('₱4,900.00')
  await expect(page.getByTestId('tax-verdict')).toContainText('taxable compensation')
  await page.getByLabel(/other taxable compensation this year/).fill('600,000')
  await expect(page.getByTestId('tax-verdict')).toContainText('₱980.00')
})

test('maternity differential and actual partial-month figures', async ({ page }) => {
  await page.getByLabel('Calculation year').selectOption(lastYear)
  await page.getByRole('button', { name: /Advanced calculator/ }).click()
  await page.getByRole('button', { name: /^April/ }).click()
  await page.getByLabel('April: actual eligible basic salary').fill('0')
  await page.getByLabel('April: maternity salary differential').fill('6,000')
  // 11 × 25,000 + 6,000 = 281,000 ÷ 12
  await expect(total(page)).toHaveText('₱23,416.67')
})

test('current year marks future months as projected', async ({ page }) => {
  test.skip(new Date().getMonth() === 11 && new Date().getDate() === 31, 'no future months on Dec 31')
  await expect(page.locator('main')).toContainText('Includes projected months')
  await expect(page.locator('#thirteenth table').getByText('Projected').first()).toBeVisible()
})

test('allocation reuses the MP2 calculator and opens it with the amount', async ({ page }) => {
  await page.getByLabel('Calculation year').selectOption(lastYear)
  const section = page.locator('[aria-labelledby="allocation-title"]')
  await expect(section).toContainText('Anong Gagawin Mo Sa 13th Month Pay Mo?')
  await expect(section).toContainText('₱5,000.00') // 20% of ₱25,000 to MP2
  await section.getByRole('button', { name: /Open in the MP2 calculator/ }).click()
  await expect(page).toHaveURL(/\/mp2$/)
  await expect(page.getByLabel('Initial investment')).toHaveValue('5,000')
})

test('literacy section has official sources and expands answers', async ({ page }) => {
  const section = page.locator('[aria-labelledby="literacy-title"]')
  await expect(section.getByRole('link', { name: /Presidential Decree No. 851/ })).toHaveAttribute('href', /lawphil\.net/)
  const q = section.getByRole('button', { name: 'Kailan dapat ibigay?' })
  await q.click()
  await expect(q).toHaveAttribute('aria-expanded', 'true')
  await expect(section).toContainText('December 24')
})

test('every input has a label', async ({ page }) => {
  await page.getByRole('button', { name: /Advanced calculator/ }).click()
  await page.getByRole('button', { name: /^January/ }).click()
  const unlabelled = await page.evaluate(() =>
    [...document.querySelectorAll('main input:not([type=hidden]), main select')].filter((el) => {
      const id = el.getAttribute('id')
      return !(id && document.querySelector(`label[for="${CSS.escape(id)}"]`)) && !el.closest('label') && !el.getAttribute('aria-label')
    }).length,
  )
  expect(unlabelled).toBe(0)
})

for (const width of [360, 390, 768, 1366, 1920]) {
  test(`no overflow or console errors at ${width}px with the advanced panel open`, async ({ page }) => {
    const errors = trackErrors(page)
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/13th-month')
    await page.getByRole('button', { name: /Advanced calculator/ }).click()
    await page.getByRole('button', { name: 'Add a salary change' }).click()
    await page.getByRole('button', { name: /^February/ }).click()
    const height = await page.evaluate(() => document.body.scrollHeight)
    for (let y = 0; y < height; y += 700) {
      await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y)
      await page.waitForTimeout(30)
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(0)
    const wide = await page.evaluate(() =>
      [...document.querySelectorAll('main *')]
        .filter((el) => {
          const r = el.getBoundingClientRect()
          return r.width > 0 && (r.right > window.innerWidth + 1 || r.left < -1) && !el.closest('[aria-hidden="true"]') && getComputedStyle(el).position !== 'absolute'
        })
        .slice(0, 5)
        .map((el) => `${el.tagName}.${String(el.className).slice(0, 60)}`),
    )
    expect(wide).toEqual([])
    expect(errors).toEqual([])
  })
}

test('mobile shows a result bar while editing inputs', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 700 })
  await page.goto('/13th-month')
  await page.getByLabel('Monthly basic salary').focus()
  const bar = page.getByRole('button', { name: /Estimated 13th month pay/ })
  await expect(bar).toBeVisible()
  await bar.click()
  await expect(total(page)).toBeInViewport()
})
