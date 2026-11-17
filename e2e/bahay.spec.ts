import { expect, test, type Page } from '@playwright/test'

/**
 * "Magkano Bahay Ngayon?" Expected figures are BSP's Q2 2026 Residential
 * Property Price Index report: median prices (Figure 4), loans granted
 * (Figures 3b–3c) and year-on-year changes (Figures 1a–2c).
 */

async function ready(page: Page) {
  await page.goto('/magkano-bahay')
  await page.waitForFunction(() => !document.getElementById('splash'))
}
async function pick(page: Page, label: string, q: string, option: RegExp) {
  await page.getByRole('combobox', { name: label }).fill(q)
  await page.getByRole('option', { name: option }).first().click()
}

test('opens on the nationwide median with its source', async ({ page }) => {
  await ready(page)
  await expect(page.getByRole('heading', { level: 1, name: 'Magkano Bahay Ngayon?' })).toBeVisible()
  await expect(page.getByTestId('median-price')).toHaveText('₱3,905,999')
  await expect(page.getByText('BSP Residential Property Price Index, Q2 2026')).toBeVisible()
})

test('San Jose del Monte uses the Balance GMA house median and says so', async ({ page }) => {
  await ready(page)
  await pick(page, 'Location', 'sjdm', /San Jose del Monte/)
  await page.getByText('House', { exact: true }).click()
  await expect(page.getByTestId('median-price')).toHaveText('₱3,465,340')
  await expect(page.getByTestId('presyo-result')).toContainText('3,146 loans')
  await expect(page.getByTestId('area-note')).toContainText('Balance GMA')
  await expect(page.getByTestId('area-note')).toContainText('does not publish separate prices for each city')
})

test('Quezon City condominium median', async ({ page }) => {
  await ready(page)
  await pick(page, 'Location', 'quezon', /Quezon City/)
  await page.getByText('Condo', { exact: true }).click()
  await expect(page.getByTestId('median-price')).toHaveText('₱5,179,350')
  await expect(page.getByTestId('growth-card')).toContainText('+7.4%')
})

test('size-based and lot prices are withheld, not estimated', async ({ page }) => {
  await ready(page)
  await page.getByRole('button', { name: /Townhouse, lot only/ }).click()
  await expect(page.getByTestId('insufficient')).toContainText('Insufficient verified market data')
})

test('compares two BSP areas, and refuses to compare within one area', async ({ page }) => {
  await ready(page)
  await page.getByRole('tab', { name: /compare/i }).click()
  await pick(page, 'First place', 'cavite', /Cavite \(province\)/)
  await pick(page, 'Second place', 'makati', /Makati/)
  await page.getByText('House', { exact: true }).click()
  await expect(page.getByTestId('compare-a')).toHaveText('₱3,465,340')
  await expect(page.getByTestId('compare-b')).toHaveText('₱8,000,000')
  await expect(page.getByTestId('compare-sentence')).toContainText('+130.9%')
  await pick(page, 'Second place', 'laguna', /Laguna \(province\)/)
  await expect(page.getByTestId('same-area')).toContainText('Insufficient verified market data')
})

test('price trends show BSP year-on-year changes', async ({ page }) => {
  await ready(page)
  await page.getByRole('tab', { name: /trends/i }).click()
  const table = page.getByTestId('trend-table')
  await expect(table).toContainText('Q2 2026')
  await expect(table.getByRole('row', { name: /^Philippines/ })).toContainText('+0.4%')
  await page.getByText('By type of home', { exact: true }).click()
  await expect(table).toContainText('Condominium units')
})

test('Overpriced ba ’to? compares with the median and never declares a verdict', async ({ page }) => {
  await ready(page)
  await page.getByRole('tab', { name: /overpriced/i }).click()
  await page.getByLabel('Asking price').fill('3,881,181')
  await pick(page, 'Location', 'bacoor', /Bacoor/)
  await page.getByText('House', { exact: true }).click()
  await expect(page.getByTestId('overpriced-percent')).toHaveText('+12.0%')
  await expect(page.getByTestId('overpriced-result')).toContainText('Ang asking price ay 12.0% above the median')
  await expect(page.getByTestId('overpriced-result')).toContainText('Hindi ito hatol')
})

test('Kaya ko ba? computes the amortization and income share', async ({ page }) => {
  await ready(page)
  await page.getByRole('tab', { name: /kaya/i }).click()
  await page.getByLabel('Property price').fill('1,250,000')
  await page.getByLabel('Interest rate a year').fill('6.5')
  await page.getByLabel('Gross monthly income').fill('30,000')
  await page.getByLabel('Monthly take-home pay').fill('25,000')
  // 20% down → ₱1,000,000 loan at 6.5% for 20 years = ₱7,455.73
  await expect(page.getByTestId('kaya-monthly')).toHaveText('₱7,455.73')
  await expect(page.getByTestId('kaya-down')).toHaveText('₱250,000')
  await expect(page.getByTestId('kaya-pti')).toHaveText('24.9%')
  await page.getByRole('button', { name: /Pag-IBIG socialized housing/ }).click()
  await expect(page.getByLabel('Interest rate a year')).toHaveValue('3')
})

test('sources and exclusions are listed with links', async ({ page }) => {
  await ready(page)
  await page.getByRole('button', { name: 'Saan galing ang data?' }).click()
  await expect(page.getByRole('link', { name: /Residential Property Price Index Report, 2nd Quarter 2026/ })).toHaveAttribute('href', /bsp\.gov\.ph/)
  await page.getByRole('button', { name: /Ano ang hindi kasama/ }).click()
  await expect(page.locator('#bahay-excluded')).toContainText('Lamudi')
})

for (const width of [320, 390, 768, 1440]) {
  test(`no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await ready(page)
    for (const t of [/trends/i, /compare/i, /kaya/i]) {
      await page.getByRole('tab', { name: t }).click()
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0)
    }
  })
}
