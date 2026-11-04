import { expect, test, type Page } from '@playwright/test'

/** Salary & expenses calculator ("Saan napupunta ang sweldo ko?"). */

const section = (page: Page) => page.locator('#sweldo')
const remaining = (page: Page) => page.getByTestId('remaining')

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/#sweldo')
})

test('₱30,000 semi-monthly: deductions and take-home pay', async ({ page }) => {
  const s = section(page)
  const deductions = s.locator('ul[data-ui]').first()
  await expect(deductions).toContainText('₱1,500')
  await expect(deductions).toContainText('₱750')
  await expect(deductions).toContainText('₱200')
  // 30,000 − 2,450 − 1,007.40 (semi-monthly table) = 26,542.60
  await expect(s).toContainText('₱26,543')
  await expect(remaining(page)).toHaveText('₱26,543')
})

test('per-payday view splits the result', async ({ page }) => {
  await section(page).getByText('Per payday', { exact: true }).click()
  await expect(remaining(page)).toHaveText('₱13,271')
  await expect(section(page)).toContainText('twice a month')
})

test('expenses, savings and status messages respond immediately', async ({ page }) => {
  const s = section(page)
  await s.getByRole('button', { name: 'Fill a sample budget' }).click()
  await expect(s).toContainText('May natitira ka pang budget this month!')
  await expect(remaining(page)).toHaveText('₱1,844')
  const rent = s.getByLabel('Rent or housing payment')
  await rent.fill('7,800')
  await expect(s).toContainText('Halos ubos na ang budget mo')
  await rent.fill('20,000')
  await expect(s).toContainText('Mas mataas ang expenses mo kaysa sa available salary mo.')
  await expect(remaining(page)).toHaveText(/^−₱/)
})

test('custom expenses can be added and removed', async ({ page }) => {
  const s = section(page)
  await s.getByRole('button', { name: /Other expenses/ }).click()
  await s.getByRole('button', { name: 'Add an expense' }).click()
  await s.getByLabel('Expense name').fill('Pet food')
  await s.getByLabel('Amount per month').first().fill('1,500')
  await expect(remaining(page)).toHaveText('₱25,043')
  await s.getByRole('button', { name: /Remove Pet food/ }).click()
  await expect(remaining(page)).toHaveText('₱26,543')
})

test('a category can be switched off', async ({ page }) => {
  const s = section(page)
  await s.getByLabel('Rent or housing payment').fill('10,000')
  await expect(remaining(page)).toHaveText('₱16,543')
  await s.getByRole('checkbox', { name: /Include housing and utilities/ }).uncheck()
  await expect(remaining(page)).toHaveText('₱26,543')
})

test('fuel estimator turns distance into a monthly cost', async ({ page }) => {
  const s = section(page)
  await s.getByRole('button', { name: /Transportation/ }).click()
  await s.getByRole('checkbox', { name: /Estimate car gasoline/ }).check()
  await s.getByLabel('Price you pay per liter').fill('60')
  // 30 km × 5 days × 52/12 = 650 km; ÷ 12 km/L = 54.17 L; × ₱60 = ₱3,250
  await expect(s).toContainText('₱3,250 for car gasoline')
  await expect(remaining(page)).toHaveText('₱23,293')
})

test('invalid salary input shows a clear error', async ({ page }) => {
  const basic = section(page).getByLabel('Basic monthly salary')
  await basic.fill('-100')
  await expect(section(page).getByRole('alert').first()).toHaveText(/cannot be negative/i)
  await basic.fill('')
  await expect(remaining(page)).toHaveText('₱0')
})

test('minimum wage earners pay no withholding tax', async ({ page }) => {
  const s = section(page)
  await s.getByLabel('Basic monthly salary').fill('18,000')
  await s.getByRole('checkbox', { name: /statutory minimum wage/ }).check()
  await expect(s).toContainText('your taxable pay is below the BIR threshold')
})

test('remember on this device is opt-in and can be cleared', async ({ page }) => {
  const s = section(page)
  await s.getByLabel('Basic monthly salary').fill('45,000')
  await page.reload()
  await expect(section(page).getByLabel('Basic monthly salary')).toHaveValue('30,000')
  await section(page).getByLabel('Basic monthly salary').fill('45,000')
  await section(page).getByRole('checkbox', { name: 'Remember on this device' }).check()
  await page.reload()
  await expect(section(page).getByLabel('Basic monthly salary')).toHaveValue('45,000')
  await section(page).getByRole('button', { name: 'Clear saved data' }).click()
  expect(await page.evaluate(() => localStorage.getItem('wib-salary-v1'))).toBeNull()
  await section(page).getByRole('button', { name: 'Reset' }).click()
  await expect(section(page).getByLabel('Basic monthly salary')).toHaveValue('30,000')
})

test('remaining money can be projected and sent to the MP2 calculator', async ({ page }) => {
  const s = section(page)
  await s.getByRole('button', { name: 'Fill a sample budget' }).click()
  await expect(s).toContainText('Paano kung i-invest mo ang natitira?')
  await expect(s.getByLabel('Amount to invest each month')).toHaveValue('1,800')
  await s.getByRole('button', { name: 'Use in the MP2 calculator' }).click()
  await expect(page.locator('#mp2').getByLabel('Monthly contribution')).toHaveValue('1,800')
})

test('accordion works with the keyboard', async ({ page }) => {
  const toggle = section(page).getByRole('button', { name: /Food and groceries/ })
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await toggle.focus()
  await page.keyboard.press('Enter')
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await expect(section(page).getByLabel('Groceries', { exact: true })).toBeVisible()
})

test('salary data never leaves the browser', async ({ page }) => {
  const external: string[] = []
  page.on('request', (r) => {
    const host = new URL(r.url()).hostname
    if (host !== 'localhost' && !host.endsWith('googleapis.com') && !host.endsWith('gstatic.com')) external.push(r.url())
  })
  await section(page).getByLabel('Basic monthly salary').fill('123,456')
  await section(page).getByRole('button', { name: 'Fill a sample budget' }).click()
  await page.waitForTimeout(500)
  expect(external).toEqual([])
})
