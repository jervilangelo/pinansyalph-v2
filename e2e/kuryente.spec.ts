import { expect, test, type Page } from '@playwright/test'

/**
 * "Magkano Kuryente Ko?" Expected figures are Meralco's own published
 * worked bills (November 2026: 200 kWh → ₱3,110.19, ₱15.5510/kWh;
 * October 2026: 200 kWh → ₱3,012.30).
 */

async function ready(page: Page) {
  await page.goto('/magkano-kuryente')
  await page.waitForFunction(() => !document.getElementById('splash'))
}

test('shows the page with the latest Meralco month and its source date', async ({ page }) => {
  await ready(page)
  await expect(page.getByRole('heading', { level: 1, name: 'Magkano Kuryente Ko?' })).toBeVisible()
  await expect(page.getByText(/Meralco rates for November 2026 billing, checked/)).toBeVisible()
  await expect(page.getByLabel('Billing month')).toHaveValue('2026-11')
  await expect(page.getByTestId('bill-empty')).toBeVisible()
})

test('matches Meralco’s November 2026 worked bill at 200 kWh', async ({ page }) => {
  await ready(page)
  await page.getByLabel('Total kWh used').fill('200')
  await expect(page.getByTestId('expected-bill')).toHaveText('₱3,110.19')
  await expect(page.getByTestId('bill-result')).toContainText('₱15.5510 per kWh')
})

test('uses the billing month’s own rates', async ({ page }) => {
  await ready(page)
  await page.getByLabel('Billing month').selectOption('2026-10')
  await page.getByLabel('Total kWh used').fill('200')
  await expect(page.getByTestId('expected-bill')).toHaveText('₱3,012.30')
})

test('computes kWh from meter readings with a multiplier', async ({ page }) => {
  await ready(page)
  await page.getByText('Meter readings', { exact: true }).click()
  await page.getByLabel('Previous reading').fill('1000')
  await page.getByLabel('Present reading').fill('1005')
  await page.getByLabel('Multiplier').fill('40')
  await expect(page.getByTestId('kwh-from-readings')).toContainText('200 kWh')
  await expect(page.getByTestId('expected-bill')).toHaveText('₱3,110.19')
})

test('explains a lower present reading instead of guessing', async ({ page }) => {
  await ready(page)
  await page.getByText('Meter readings', { exact: true }).click()
  await page.getByLabel('Previous reading').fill('5000')
  await page.getByLabel('Present reading').fill('100')
  await expect(page.getByRole('alert').filter({ hasText: 'lower than the previous' })).toBeVisible()
})

test('a matching bill says so; a higher one lists reasons, not a verdict', async ({ page }) => {
  await ready(page)
  await page.getByLabel('Total kWh used').fill('200')
  await page.getByLabel('Current charges on your bill').fill('3110.19')
  await expect(page.getByTestId('bill-check')).toContainText('Tugma sa published rates')
  await page.getByLabel('Current charges on your bill').fill('3610.19')
  await expect(page.getByTestId('bill-difference')).toHaveText('+₱500.00')
  await expect(page.getByTestId('bill-percent')).toHaveText('+16.08%')
  await expect(page.getByTestId('bill-check')).toContainText('unpaid balance')
  await expect(page.getByTestId('bill-check')).not.toContainText(/overcharg/i)
})

test('line-by-line comparison shows each group', async ({ page }) => {
  await ready(page)
  await page.getByLabel('Total kWh used').fill('200')
  await page.getByRole('button', { name: /Compare line by line/ }).click()
  await page.getByLabel('Generation', { exact: true }).fill('2126.98')
  await expect(page.getByTestId('bill-lines')).toContainText('Generation')
  await expect(page.getByTestId('bill-lines')).toContainText('same')
})

test('registered lifeline households get the discount', async ({ page }) => {
  await ready(page)
  await page.getByRole('button', { name: 'Household details' }).click()
  await page.getByLabel('Registered lifeline household').check()
  await page.getByLabel('Total kWh used').fill('70')
  await expect(page.getByTestId('expected-bill')).toHaveText('₱718.05')
})

test('another provider uses a typed rate and is labelled an estimate', async ({ page }) => {
  await ready(page)
  await page.getByLabel('Electricity provider').selectOption('manual')
  await page.getByLabel('Your rate per kWh').fill('12.5')
  await page.getByLabel('Total kWh used').fill('100')
  await expect(page.getByTestId('expected-bill')).toHaveText('₱1,250.00')
  await expect(page.getByTestId('bill-result')).toContainText('An estimate')
})

test('appliances: add, edit and remove, with kWh and cost', async ({ page }) => {
  await ready(page)
  await page.getByRole('tab', { name: /Appliance/ }).click()
  await page.getByLabel('Add an appliance').selectOption({ label: 'Electric fan' })
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  const list = page.getByTestId('appliance-list')
  await expect(list).toContainText('12 kWh') // 50 W × 8 h × 30 days
  await list.getByLabel('Hours a day').fill('4')
  await expect(list).toContainText('6 kWh')
  await expect(page.getByTestId('appliance-result')).toContainText('Electric fan')
  await list.getByRole('button', { name: /Remove/ }).click()
  await expect(page.getByTestId('appliance-result')).toHaveCount(0)
})

test('compare bills splits the increase into usage and rate', async ({ page }) => {
  await ready(page)
  await page.getByRole('tab', { name: /Compare/ }).click()
  const before = page.getByTestId('compare-before')
  await before.getByLabel('kWh used').fill('200')
  await before.getByLabel('Current charges').fill('3012.30')
  const after = page.getByTestId('compare-after')
  await after.getByLabel('kWh used').fill('250')
  await after.getByLabel('Current charges').fill('3900')
  await expect(page.getByTestId('compare-change')).toHaveText('+₱887.70')
  await expect(page.getByTestId('from-usage')).toHaveText('+₱753.08')
  await expect(page.getByTestId('from-rate')).toHaveText('+₱134.62')
  await expect(page.getByTestId('meralco-rate-change')).toContainText('₱15.06')
})

test('savings: fewer aircon hours, priced with the tariff', async ({ page }) => {
  await ready(page)
  await page.getByLabel('Total kWh used').fill('200')
  await page.getByRole('tab', { name: /Appliance/ }).click()
  await page.getByRole('button', { name: 'Add', exact: true }).click() // first preset: inverter aircon
  await page.getByRole('tab', { name: /Save/ }).click()
  await expect(page.getByLabel('Your monthly kWh now')).toHaveValue('200')
  // 900 W × 2 h fewer × 30 days × 50% = 27 kWh; bill at 200 minus bill at 173 kWh
  await expect(page.getByTestId('save-result')).toContainText('27 kWh less')
  await expect(page.getByTestId('save-monthly')).toHaveText('₱416.38')
  await expect(page.getByTestId('save-yearly')).toHaveText('₱4,996.56')
})

test('tabs work with the keyboard', async ({ page }) => {
  await ready(page)
  await page.getByRole('tab', { name: /Check/ }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('tab', { name: /Appliance/ })).toHaveAttribute('aria-selected', 'true')
  await page.keyboard.press('End')
  await expect(page.getByRole('tab', { name: /Save/ })).toBeFocused()
})

for (const width of [320, 390, 768, 1440]) {
  test(`no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await ready(page)
    await page.getByLabel('Total kWh used').fill('350')
    await page.getByLabel('Current charges on your bill').fill('5900')
    await expect(page.getByTestId('bill-check')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0)
    await page.getByRole('tab', { name: /Appliance/ }).click()
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0)
  })
}
