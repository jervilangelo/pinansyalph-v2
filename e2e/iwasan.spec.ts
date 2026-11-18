import { expect, test, type Page } from '@playwright/test'

/** "Mga Dapat Iwasan": the red, far-right toolbar entry and the page's simulators. */

const S = (page: Page, id: string) => page.getByTestId(id)

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
})

test.describe('main toolbar entry', () => {
  for (const width of [1024, 1280, 1440, 1920]) {
    test(`is the last, rightmost item and overlaps nothing at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/')
      const nav = page.getByRole('navigation', { name: 'Main' })
      const items = nav.locator('a:visible, button:visible')
      const n = await items.count()
      const last = items.nth(n - 1)
      await expect(last).toHaveAttribute('data-testid', 'iwasan-nav')
      await expect(last).toContainText('Mga Dapat Iwasan')
      const boxes = await Promise.all(Array.from({ length: n }, (_, i) => items.nth(i).boundingBox()))
      for (let i = 1; i < n; i++) expect(boxes[i]!.x, `item ${i} starts after item ${i - 1} ends`).toBeGreaterThanOrEqual(boxes[i - 1]!.x + boxes[i - 1]!.width - 1)
      const lastBox = boxes[n - 1]!
      const rightmost = Math.max(...boxes.map((b) => b!.x + b!.width))
      expect(lastBox.x + lastBox.width).toBe(rightmost)
      expect(lastBox.x + lastBox.width).toBeLessThanOrEqual(width)
      // The other toolbar items are still there.
      await expect(nav.getByRole('button', { name: 'Tools' })).toBeVisible()
      await expect(nav.getByRole('link', { name: 'About', exact: true })).toBeVisible()
    })
  }

  test('red icon, red text, BASAHIN badge, hover and keyboard focus, and it opens the page', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/')
    const item = S(page, 'iwasan-nav')
    const badge = item.getByTestId('iwasan-badge')
    await expect(badge).toBeVisible()
    await expect(badge).toHaveText('BASAHIN')
    const red = (c: string) => {
      const [r, g, b] = c.match(/\d+/g)!.map(Number)
      return r > 100 && r > g * 2 && r > b * 2
    }
    expect(red(await item.locator('svg').evaluate((e) => getComputedStyle(e).color)), 'icon is red').toBe(true)
    expect(red(await item.evaluate((e) => getComputedStyle(e).color)), 'text is red').toBe(true)
    expect(red(await badge.evaluate((e) => getComputedStyle(e).backgroundColor)), 'badge is red').toBe(true)

    const before = await item.evaluate((e) => getComputedStyle(e).backgroundColor)
    await item.hover()
    await expect.poll(() => item.evaluate((e) => getComputedStyle(e).backgroundColor)).not.toBe(before)

    await page.mouse.move(0, 500)
    await item.focus()
    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('Tab')
    await expect(item).toBeFocused()
    expect(await item.evaluate((e) => getComputedStyle(e).outlineStyle)).not.toBe('none')

    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/mga-dapat-iwasan$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Mga Dapat Iwasan')
    await expect(item).toHaveAttribute('aria-current', 'page')
    await expect(page).toHaveTitle(/^Mga Dapat Iwasan · PinansyalPH$/)
  })

  test('other toolbar links keep working', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/mga-dapat-iwasan')
    const nav = page.getByRole('navigation', { name: 'Main' })
    await nav.getByRole('link', { name: 'About', exact: true }).click()
    await expect(page).toHaveURL(/\/about$/)
    await nav.getByRole('button', { name: 'Tools' }).click()
    await page
      .locator('#tools-menu')
      .getByRole('link', { name: /^Sweldo/ })
      .click()
    await expect(page).toHaveURL(/\/sweldo$/)
  })

  for (const width of [320, 390, 768]) {
    test(`keeps its red identity on smaller screens at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 })
      await page.goto('/')
      const compact = S(page, 'iwasan-nav-compact')
      await expect(compact).toBeVisible()
      await expect(compact.getByTestId('iwasan-badge')).toBeVisible()
      const box = (await compact.boundingBox())!
      expect(box.x + box.width).toBeLessThanOrEqual(width)
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0)
      await page.getByRole('button', { name: 'Open menu' }).click()
      await expect(S(page, 'iwasan-mobile-link')).toBeVisible()
      await expect(S(page, 'iwasan-mobile-link')).toContainText('BASAHIN')
      await S(page, 'iwasan-mobile-link').click()
      await expect(page).toHaveURL(/\/mga-dapat-iwasan$/)
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0)
    })
  }
})

test.describe('page and calculators', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/mga-dapat-iwasan')
  })

  const tab = (page: Page, name: string) => page.getByRole('tab', { name })

  test('short English page: hero, six things to avoid with examples, help and sources', async ({ page }) => {
    await expect(page.locator('main')).toContainText('Money traps that quietly drain your wallet.')
    await expect(S(page, 'avoid-item')).toHaveCount(6)
    await expect(S(page, 'avoid-list')).toContainText('Betting and gambling sites')
    await expect(S(page, 'avoid-list')).toContainText('Online loan apps')
    await expect(S(page, 'avoid-betting-example')).toContainText('₱4,212')
    await expect(S(page, 'avoid-loan-apps-example')).toContainText('₱8,500')
    await expect(S(page, 'avoid-loan-apps-example')).toContainText('₱10,600')
    await expect(S(page, 'avoid-reborrowing-example')).toContainText('₱8,337')
    await expect(S(page, 'avoid-minimum-example')).toContainText('more than 50 years')
    await expect(S(page, 'avoid-installments-example')).toContainText('₱3,600')
    await expect(S(page, 'avoid-impulse-example')).toContainText('₱36,500')
    await expect(S(page, 'iwasan-entry')).toHaveCount(6)
    await S(page, 'iwasan-entry').nth(1).click()
    await expect(page).toHaveURL(/#avoid-loan-apps$/)
    await expect(S(page, 'get-help')).toContainText('PAGCOR')
    await page.getByRole('button', { name: /^Sources/ }).click()
    await expect(S(page, 'iwasan-sources').getByRole('listitem')).toHaveCount(11)
    await expect(S(page, 'iwasan-sources').getByRole('link', { name: /^Circular No. 1133/ })).toHaveAttribute('href', 'https://www.bsp.gov.ph/Regulations/Issuances/2021/1133.pdf')
  })

  test('betting: expected loss = total bet × house edge', async ({ page }) => {
    await expect(S(page, 'g-expected-loss')).toHaveText('₱4,212.00')
    await expect(S(page, 'g-total-wagered')).toHaveText('₱156,000.00')
    await expect(S(page, 'g-week')).toHaveText('₱81')
    await page.getByRole('button', { name: /Double-zero roulette/ }).click()
    await expect(S(page, 'g-expected-loss')).toHaveText('₱8,205.60')
    await page.getByLabel('Total bet per session, exact value').fill('500')
    await expect(S(page, 'g-expected-loss')).toHaveText('₱4,102.80')
  })

  test('loans: cash received, repayment, real cost, and borrowing again', async ({ page }) => {
    await tab(page, 'Loans').click()
    await expect(S(page, 'l-cash')).toHaveText('₱8,500.00')
    await expect(S(page, 'l-repay')).toHaveText('₱10,600.00')
    await expect(S(page, 'l-total-cost')).toHaveText('₱2,100.00')
    await expect(S(page, 'l-eir')).toHaveText('24.71%')
    const again = page.getByRole('slider', { name: 'Times you borrow again to pay it' })
    await again.focus()
    for (let i = 0; i < 2; i++) await again.press('ArrowRight')
    // Borrowing twice more to pay it: what is owed grows past the original repayment.
    await expect(S(page, 'l-again')).toHaveText('2')
    await expect(S(page, 'l-owed')).toBeVisible()
    const owed = Number((await S(page, 'l-owed').textContent())!.replace(/[₱,]/g, ''))
    expect(owed).toBeGreaterThan(10600)
  })

  test('credit card: minimum only versus a fixed payment', async ({ page }) => {
    await tab(page, 'Credit card').click()
    await expect(S(page, 'card-minimum-months')).toHaveText('Over 50 years')
    await expect(S(page, 'card-fixed-months')).toHaveText('1 yr 9 mo')
    await page.getByLabel('Card balance').fill('10,000')
    await page.getByLabel('What you’ll pay each month').fill('1,000')
    await expect(S(page, 'card-fixed-months')).toHaveText('1 yr 1 mo')
  })

  test('installments: monthly total, share of pay and what is left', async ({ page }) => {
    await tab(page, 'Installments').click()
    await expect(S(page, 'inst-total')).toHaveText('₱3,600.00')
    await expect(S(page, 'inst-pct')).toHaveText('14.4%')
    await expect(S(page, 'inst-left')).toHaveText('₱21,400.00')
    await expect(S(page, 'inst-remaining')).toHaveText('₱24,900.00')
    await page.getByRole('button', { name: 'Remove Gadget' }).click()
    await expect(S(page, 'inst-total')).toHaveText('₱2,700.00')
  })

  test('if you saved it: 0% is plain addition, returns compound', async ({ page }) => {
    await tab(page, 'If you saved it').click()
    await expect(S(page, 's-fv')).toHaveText('₱182,500.00')
    await page.getByText('Monthly', { exact: true }).click()
    await page.getByLabel('Amount', { exact: true }).fill('1,000')
    const yrs = page.getByRole('slider', { name: 'For' })
    await yrs.focus()
    for (let i = 0; i < 5; i++) await yrs.press('ArrowRight')
    await expect(S(page, 's-fv')).toHaveText('₱120,000.00')
    await expect(S(page, 's-scenarios')).toContainText('At 6% a year')
  })

  for (const width of [320, 390, 768, 1440]) {
    test(`no horizontal overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/mga-dapat-iwasan')
      for (const name of ['Betting', 'Loans', 'Installments']) {
        await page.getByRole('tab', { name: new RegExp(name === 'Installments' ? 'Install' : name) }).click()
        expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), name).toBeLessThanOrEqual(0)
      }
    })
  }
})
