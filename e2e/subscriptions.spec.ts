import { expect, test, type Page } from '@playwright/test'

/** "Magkano ba Subscription Ko?" — subscription tracker. */

const search = (page: Page) => page.getByRole('combobox', { name: 'App or service' })
const monthly = (page: Page) => page.getByTestId('subs-monthly')
const rows = (page: Page) => page.getByTestId('sub-row')

async function addFromDirectory(page: Page, query: string, option: RegExp, opts: { plan?: string; billing?: 'monthly' | 'quarterly' | 'annual' } = {}) {
  await search(page).fill(query)
  await page.getByRole('option', { name: option }).click()
  if (opts.plan) await page.getByLabel('Plan').selectOption(opts.plan)
  if (opts.billing) await page.getByLabel('Billed').selectOption(opts.billing)
  await page.getByRole('button', { name: 'Add to my list' }).click()
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/magkano-subscription')
})

test('heading, subtitle, empty state and source status', async ({ page }) => {
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Magkano ba Subscription Ko?')
  await expect(page.locator('main')).toContainText('Think it is small? Let us see how much it all adds up to.')
  await expect(page.getByTestId('subs-empty')).toBeVisible()
  await expect(monthly(page)).toHaveText('₱0.00')
  await expect(page).toHaveTitle(/Magkano ba Subscription Ko\?.*· PinansyalPH$/)
})

test('picking a service fills in its official price, with the source', async ({ page }) => {
  await search(page).fill('netf')
  await expect(page.getByRole('option', { name: /^Netflix/ })).toBeVisible()
  await page.getByRole('option', { name: /^Netflix/ }).click()
  await page.getByLabel('Plan').selectOption('standard')
  await expect(page.getByTestId('sub-price')).toHaveText('₱449.00')
  await expect(page.getByTestId('price-note')).toContainText('Official Philippine price')
  await expect(page.getByTestId('price-note').getByRole('link', { name: 'Source' })).toHaveAttribute('href', 'https://help.netflix.com/en/node/24926')
  await page.getByRole('button', { name: 'Add to my list' }).click()
  await expect(rows(page)).toHaveCount(1)
  await expect(monthly(page)).toHaveText('₱449.00')
  await expect(page.getByTestId('subs-annual')).toHaveText('₱5,388.00')
})

test('a yearly plan is spread across 12 months', async ({ page }) => {
  await addFromDirectory(page, 'disney', /^Disney\+/, { plan: 'standard', billing: 'annual' })
  // ₱2,290 a year ÷ 12 = ₱190.83 a month.
  await expect(monthly(page)).toHaveText('₱190.83')
  await expect(page.getByTestId('subs-annual')).toHaveText('₱2,290.00')
  await expect(rows(page).first()).toContainText('₱2,290.00 a year')
})

test('a billing period the service does not price is left for you to enter', async ({ page }) => {
  await search(page).fill('netflix')
  await page.getByRole('option', { name: /^Netflix/ }).click()
  await page.getByLabel('Billed').selectOption('annual')
  await expect(page.getByTestId('sub-price')).toHaveText('₱0.00')
  await expect(page.getByTestId('price-note')).toContainText('No official yearly price')
  await page.getByRole('button', { name: 'Add to my list' }).click()
  await expect(page.getByRole('alert')).toContainText('more than ₱0')
})

test('the slider and the exact field both set the amount; a split plan counts only your share', async ({ page }) => {
  await search(page).fill('spotify')
  await page.getByRole('option', { name: /^Spotify/ }).click()
  await page.getByLabel('Plan').selectOption('family')
  await expect(page.getByTestId('sub-price')).toHaveText('₱279.00')
  const slider = page.getByRole('slider')
  await slider.focus()
  await slider.press('ArrowRight')
  await expect(page.getByTestId('sub-price')).toHaveText('₱280.00')
  await page.getByLabel('Exact amount a month').fill('279')
  await expect(page.getByTestId('sub-price')).toHaveText('₱279.00')
  for (let i = 0; i < 2; i++) await page.getByRole('button', { name: 'One person more' }).click()
  await expect(page.getByTestId('sub-people')).toHaveText('3')
  await expect(page.locator('main')).toContainText('Your share: ₱93.00 a month')
  await page.getByRole('button', { name: 'Add to my list' }).click()
  await expect(monthly(page)).toHaveText('₱93.00')
  await expect(rows(page).first()).toContainText('split 3 ways, you pay ₱93.00')
})

test('US-dollar and unverified services ask for your own amount, never a converted one', async ({ page }) => {
  await search(page).fill('claude')
  await page.getByRole('option', { name: /^Claude/ }).click()
  await expect(page.getByTestId('price-note')).toContainText('Billed in US dollars')
  await expect(page.getByTestId('price-note')).toContainText('US$20/mo')
  await expect(page.getByTestId('sub-price')).toHaveText('₱0.00')
  await page.getByRole('button', { name: 'Choose a different app' }).click()
  await search(page).fill('viu')
  await page.getByRole('option', { name: /^Viu/ }).click()
  await expect(page.getByTestId('price-note')).toContainText('Price not verified')
})

test('custom subscription with icon, category and amount', async ({ page }) => {
  await page.getByRole('button', { name: 'Or add a custom subscription' }).click()
  await page.getByLabel('Subscription name').fill('Gym')
  await page.getByTitle('Fitness').click()
  await page.getByLabel('Category').selectOption('lifestyle')
  await page.getByLabel('Billed').selectOption('quarterly')
  await page.getByLabel('Exact amount every 3 months').fill('4,500')
  await page.getByRole('button', { name: 'Add to my list' }).click()
  await expect(rows(page).first()).toContainText('Gym')
  await expect(monthly(page)).toHaveText('₱1,500.00')
})

test('edit and remove', async ({ page }) => {
  await page.getByRole('button', { name: /^Netflix Standard/ }).click()
  await page.getByRole('button', { name: /^Spotify Premium Individual/ }).click()
  await expect(monthly(page)).toHaveText('₱618.00')
  await page.getByRole('button', { name: 'Edit Netflix' }).click()
  await expect(page.getByRole('heading', { name: 'Edit Netflix' })).toBeVisible()
  await page.getByLabel('Exact amount a month').fill('500')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(monthly(page)).toHaveText('₱669.00')
  await page.getByRole('button', { name: 'Remove Spotify Premium' }).click()
  await expect(rows(page)).toHaveCount(1)
  await expect(monthly(page)).toHaveText('₱500.00')
})

test('dashboard: count, average, most expensive, annual shock and breakdown', async ({ page }) => {
  for (const n of [/^Netflix Standard/, /^Spotify Premium Individual/, /^ChatGPT Plus/]) await page.getByRole('button', { name: n }).click()
  await expect(monthly(page)).toHaveText('₱1,718.00')
  await expect(page.getByTestId('subs-count')).toHaveText('3')
  await expect(page.getByTestId('subs-average')).toHaveText('₱573/mo')
  await expect(page.getByTestId('subs-top')).toHaveText('ChatGPT')
  await expect(page.getByTestId('annual-shock')).toContainText('₱20,616')
  const table = page.getByTestId('category-table')
  await expect(table.getByRole('row', { name: /AI tools/ })).toContainText('₱1,100.00')
  await expect(table.getByRole('row', { name: /Streaming and music/ })).toContainText('₱618.00')
  await expect(page.getByTestId('top-list').getByRole('listitem').first()).toContainText('ChatGPT')
})

test('what if I cancel', async ({ page }) => {
  for (const n of [/^Netflix Standard/, /^ChatGPT Plus/]) await page.getByRole('button', { name: n }).click()
  await page.getByRole('tab', { name: /cancel/i }).click()
  await page.getByRole('checkbox', { name: /ChatGPT/ }).check()
  await expect(page.getByTestId('cancel-monthly')).toHaveText('₱1,100.00')
  await expect(page.getByTestId('cancel-annual')).toHaveText('₱13,200.00')
  await expect(page.getByTestId('cancel-new')).toHaveText('₱449.00')
  await expect(page.getByTestId('cancel-pct')).toHaveText('71.0%')
  // The list itself is untouched.
  await expect(rows(page)).toHaveCount(2)
})

test('budget, and everything survives a reload', async ({ page }) => {
  await page.getByRole('button', { name: /^Netflix Standard/ }).click()
  await page.getByRole('tab', { name: 'Budget' }).click()
  await page.getByLabel('Exact budget').fill('400')
  await expect(page.getByTestId('budget-used')).toHaveText('112.3%')
  await expect(page.getByTestId('budget-left')).toHaveText('₱49.00 over budget')
  await page.getByLabel('Exact budget').fill('2,000')
  await expect(page.getByTestId('budget-left')).toHaveText('₱1,551.00 left this month')
  await page.reload()
  await expect(rows(page)).toHaveCount(1)
  await expect(monthly(page)).toHaveText('₱449.00')
  await page.getByRole('tab', { name: 'Budget' }).click()
  await expect(page.getByTestId('budget-used')).toHaveText('22.5%')
  await expect(page.locator('main')).toContainText('Saved only in this browser')
})

test('renewals: a date you enter shows up with the amount due', async ({ page }) => {
  const soon = await page.evaluate(() => {
    const d = new Date(Date.now() + 5 * 86_400_000)
    return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })
  })
  await search(page).fill('youtube premium')
  await page.getByRole('option', { name: /^YouTube Premium/ }).click()
  await page.getByLabel('Next renewal date').fill(soon)
  await page.getByRole('button', { name: 'Add to my list' }).click()
  await page.getByRole('tab', { name: 'Renewals' }).click()
  const list = page.getByTestId('renewal-list')
  await expect(list).toContainText('YouTube Premium')
  await expect(list).toContainText('₱189.00')
  await expect(list).toContainText(/In [45] days/)
})

test('reachable from the homepage index and the tools menu', async ({ page }) => {
  await page.goto('/')
  await page.locator('#tools').getByRole('link', { name: /Magkano ba Subscription Ko\?/ }).click()
  await expect(page).toHaveURL(/\/magkano-subscription$/)
  await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Tools' }).click()
  await expect(page.locator('#tools-menu').getByRole('link', { name: /^Subscriptions/ })).toHaveAttribute('aria-current', 'page')
})

for (const width of [320, 390, 768, 1440]) {
  test(`no horizontal overflow with a full dashboard at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    for (const n of [/^Netflix Standard/, /^Spotify Premium Individual/, /^ChatGPT Plus/, /^iCloud\+ 50 GB/]) await page.getByRole('button', { name: n }).click()
    await search(page).fill('microsoft')
    await page.getByRole('option', { name: /^Microsoft 365/ }).click()
    for (const tab of ['Breakdown', 'Cancel', 'Budget', 'Renewals']) {
      await page.getByRole('tab', { name: new RegExp(tab === 'Breakdown' ? 'Where it goes|Breakdown' : tab, 'i') }).click()
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      expect(overflow, tab).toBeLessThanOrEqual(0)
    }
  })
}
