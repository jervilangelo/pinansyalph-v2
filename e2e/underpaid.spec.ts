import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { comparePay } from '../src/calculators/salaryBenchmark'
import { peso } from '../src/utils/format'

/** "Underpaid ba ko?" — salary comparison with PSA OWS data, and the job offer comparison. */

const data = JSON.parse(readFileSync(new URL('../src/data/salary-benchmarks.json', import.meta.url), 'utf8')) as {
  benchmarks: { occupation: string; survey: string; region: string; industry: string; measure: string; basis: string; value: number }[]
}
const figure = (occupation: string, region: string, survey = 'ows-2024') =>
  data.benchmarks.find((b) => b.occupation === occupation && b.region === region && b.industry === 'all' && b.measure === 'average' && b.basis === 'wage-rate' && b.survey === survey)!.value

const job = (page: Page) => page.getByRole('combobox', { name: 'Job title' })

async function pickJob(page: Page, query: string, option: string | RegExp) {
  await job(page).fill(query)
  await page.getByRole('option', { name: option }).click()
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/underpaid-ba-ko')
})

test('heading, subtitle, source and an empty state before any input', async ({ page }) => {
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Underpaid ba ko?')
  await expect(page.locator('main')).toContainText('Find out if your salary is competitive.')
  await expect(page.getByTestId('underpaid-empty')).toContainText('Start with your job title.')
  await expect(page).toHaveTitle(/Underpaid ba ko\?.*· PinansyalPH$/)
})

test('office clerk in NCR is compared with PSA’s published NCR figure', async ({ page }) => {
  await pickJob(page, 'office clerk', /^Office clerk/)
  await expect(page.locator('main')).toContainText('Matched to PSA: General office clerks')
  await page.getByLabel('Where you work').selectOption('ncr')
  await page.getByLabel('Basic monthly pay', { exact: true }).fill('20,000')
  await page.getByLabel('Regular monthly allowances').fill('1,000')

  const benchmark = figure('general-office-clerks', 'ncr')
  const expected = comparePay(21_000, benchmark)
  const result = page.getByTestId('underpaid-result')
  await expect(result).toBeVisible()
  await expect(page.getByTestId('underpaid-difference')).toHaveText(`${expected.difference < 0 ? '−' : '+'}${peso(Math.abs(expected.difference))}`)
  await expect(page.getByTestId('underpaid-percent')).toContainText(`${Math.abs(expected.percent).toFixed(1)}%`)
  await expect(page.locator('main')).toContainText(peso(benchmark))
  await expect(page.locator('main')).toContainText('2024 Occupational Wages Survey')
  await expect(page.locator('main')).toContainText('August 2024')
})

test('the national elementary-occupations figure matches PSA’s headline ₱13,506', async ({ page }) => {
  await pickJob(page, 'janitor', /^Janitor or cleaner/)
  await page.getByLabel('Where you work').selectOption('ph')
  await page.getByLabel('Basic monthly pay', { exact: true }).fill('13,506')
  await expect(page.getByTestId('underpaid-result')).toContainText('Close to the benchmark')
  await expect(page.getByTestId('underpaid-difference')).toHaveText('₱0')
})

test('a job with no PSA benchmark says so and compares with all workers', async ({ page }) => {
  await pickJob(page, 'IT support', /^IT Support Specialist/)
  await expect(page.getByLabel('Industry (optional)')).toHaveValue('information-communications')
  await page.getByLabel('Basic monthly pay', { exact: true }).fill('25,000')
  await expect(page.getByTestId('no-occupation-benchmark')).toContainText('no benchmark for IT Support Specialist')
  await expect(page.getByTestId('underpaid-result')).toContainText('all workers')
})

test('"my job is not listed" works, and the combobox is keyboard operable', async ({ page }) => {
  await job(page).fill('zzz')
  await expect(page.locator('#underpaid')).toContainText('No job title matches')
  await page.getByRole('button', { name: /My job is not listed/ }).click()
  await page.getByLabel('Basic monthly pay', { exact: true }).fill('30,000')
  await expect(page.getByTestId('no-occupation-benchmark')).toContainText('not in PSA’s open benchmark list')

  await job(page).fill('bookk')
  // Wait for the list to show the match before using the keyboard (CI machines render more slowly).
  await expect(page.getByRole('option', { name: /^Bookkeeper/ })).toBeVisible()
  await job(page).press('ArrowDown')
  await job(page).press('Enter')
  await expect(job(page)).toHaveValue('Bookkeeper')
  await expect(page.locator('main')).toContainText('Matched to PSA: Accounting and bookkeeping clerks')
  // Only 2022 data exists for this occupation: the result says which survey.
  await expect(page.locator('main')).toContainText('2022 Occupational Wages Survey')
})

test('rejects negative pay with a clear message', async ({ page }) => {
  await pickJob(page, 'office clerk', /^Office clerk/)
  await page.getByLabel('Basic monthly pay', { exact: true }).fill('-5')
  await expect(page.locator('#underpaid').getByRole('alert').first()).toHaveText(/cannot be negative/i)
})

test('methodology and limits are disclosed on request', async ({ page }) => {
  await pickJob(page, 'office clerk', /^Office clerk/)
  await page.getByLabel('Basic monthly pay', { exact: true }).fill('18,000')
  await page.getByRole('button', { name: /What PSA’s figures mean/ }).click()
  const m = page.locator('#methodology')
  await expect(m).toContainText('Basic pay plus regular, guaranteed cash allowances')
  await expect(m).toContainText('no percentiles, sample sizes or experience levels')
  await expect(m).toContainText('openstat.psa.gov.ph')
  await page.getByRole('button', { name: /Other published comparisons/ }).click()
  await expect(page.locator('#other-comparisons')).toContainText('All workers in NCR')
  await page.getByRole('button', { name: /Before you draw conclusions/ }).click()
  await expect(page.locator('main')).toContainText('not a legal one')
})

test('job offer: a raise with a longer commute, computed with the payroll engine', async ({ page }) => {
  const offer = page.getByTestId('offer-new')
  await offer.getByLabel('Basic monthly pay').fill('27,000')
  await offer.getByLabel('Commute per office day').fill('400')
  const current = page.getByTestId('offer-current')
  await current.getByText('Remote', { exact: true }).click()
  await expect(current.getByLabel('Commute per office day')).toHaveCount(0)
  // Current: ₱25,000 remote, no costs. Offer: ₱27,000 on-site, ₱400 × 5 × 52 ÷ 12 = ₱8,667 commute.
  await expect(page.getByTestId('offer-disposable')).toHaveText(/^−₱/)
  await expect(page.locator('#offer-breakdown')).toContainText('₱8,667')
  await page.getByRole('button', { name: /Assumptions and limits/ }).click()
  await expect(page.locator('#job-offer')).toContainText('does not recommend a choice')
})

test('reachable from the tools menu, the homepage and the Sweldo page; survives refresh', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('#tools').getByRole('link', { name: /Underpaid ba ko\?/ })).toBeVisible()
  await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Tools' }).click()
  await page.locator('#tools-menu').getByRole('link', { name: /^Underpaid ba ko\?/ }).click()
  await expect(page).toHaveURL(/\/underpaid-ba-ko$/)
  await page.reload()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Underpaid ba ko?')
  await page.goto('/sweldo')
  await page.getByRole('link', { name: /Underpaid ba ko\?/ }).first().click()
  await expect(page).toHaveURL(/\/underpaid-ba-ko$/)
})

for (const width of [320, 360, 390, 430, 768, 1024, 1440, 1920]) {
  test(`no horizontal overflow with a result shown at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/underpaid-ba-ko')
    await pickJob(page, 'office clerk', /^Office clerk/)
    await page.getByLabel('Basic monthly pay', { exact: true }).fill('20,000')
    await page.getByRole('button', { name: /Other published comparisons/ }).click()
    await page.getByRole('button', { name: /What PSA’s figures mean/ }).click()
    await expect(page.getByTestId('underpaid-result')).toBeVisible()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  })
}

test('on a phone, a result bar appears and jumps to the answer', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/underpaid-ba-ko')
  await pickJob(page, 'office clerk', /^Office clerk/)
  await page.getByLabel('Basic monthly pay', { exact: true }).fill('20,000')
  const bar = page.getByRole('button', { name: /See your result/ })
  await expect(bar).toBeVisible()
  await bar.click()
  await expect(page.getByTestId('underpaid-result')).toBeInViewport()
  await expect(bar).toBeHidden()
})
