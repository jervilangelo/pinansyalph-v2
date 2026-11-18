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

test.describe('page and simulators', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/mga-dapat-iwasan')
  })

  test('hero, three entry points and the sources list', async ({ page }) => {
    await expect(page.locator('main')).toContainText('Kilalanin ang mga financial traps bago pa maubos ang pera mo.')
    await expect(S(page, 'iwasan-entry')).toHaveCount(3)
    await S(page, 'iwasan-entry').nth(1).click()
    await expect(page).toHaveURL(/#utang$/)
    const sources = S(page, 'iwasan-sources').getByRole('listitem')
    await expect(sources).toHaveCount(20)
    await expect(S(page, 'iwasan-sources')).toContainText('Circular No. 1165')
    await expect(S(page, 'iwasan-sources').getByRole('link', { name: /^Circular No. 1133/ })).toHaveAttribute('href', 'https://www.bsp.gov.ph/Regulations/Issuances/2021/1133.pdf')
  })

  test('gambling: expected loss = total wagered × house edge, over different periods', async ({ page }) => {
    await expect(S(page, 'g-expected-loss')).toHaveText('₱4,212.00')
    await expect(S(page, 'g-total-wagered')).toHaveText('₱156,000.00')
    await expect(S(page, 'g-week')).toHaveText('₱81')
    await expect(S(page, 'g-month')).toHaveText('₱351')
    await page.getByRole('button', { name: /Double-zero roulette/ }).click()
    await expect(S(page, 'g-edge')).toHaveText('5.26%')
    await expect(S(page, 'g-expected-loss')).toHaveText('₱8,205.60')
    await page.getByLabel('Total bet per session, exact value').fill('500')
    await expect(S(page, 'g-expected-loss')).toHaveText('₱4,102.80')
    await page.getByLabel('Total bet per session, exact value').fill('0')
    await expect(page.locator('#sugal').getByRole('alert').first()).toBeVisible()
  })

  test('variance demo: deterministic, and changes when asked', async ({ page }) => {
    const text = await S(page, 'v-ahead').textContent()
    await page.getByRole('button', { name: 'Six other players' }).click()
    await expect(S(page, 'v-ahead')).toContainText('of 6')
    expect(text).toContain('The average expectation is')
  })

  test('loan: cash received, fees, total cost and effective monthly cost', async ({ page }) => {
    await expect(S(page, 'l-cash')).toHaveText('₱8,500.00')
    await expect(S(page, 'l-repay')).toHaveText('₱10,600.00')
    await expect(S(page, 'l-total-cost')).toHaveText('₱2,100.00')
    await expect(S(page, 'l-shortfall')).toHaveText('₱1,500.00')
    await expect(S(page, 'l-eir')).toHaveText('24.71%')
    await expect(S(page, 'l-ceiling')).toContainText('at most 15% a month')
    await page.getByLabel('Late fees you expect').fill('500')
    await expect(S(page, 'l-total-cost')).toHaveText('₱2,600.00')
    await page.getByLabel('Loan amount (as advertised)').fill('20,000')
    await expect(S(page, 'l-ceiling')).toHaveCount(0)
  })

  test('loan: diminishing balance and several payments', async ({ page }) => {
    await page.getByLabel('Fees deducted before you get the cash').fill('0')
    await page.getByLabel('Loan amount (as advertised)').fill('12,000')
    await page.getByLabel('Interest rate a month').fill('2')
    await page.getByText('Diminishing balance', { exact: true }).click()
    const months = page.getByRole('slider', { name: 'Loan length' })
    await months.focus()
    for (let i = 0; i < 22; i++) await months.press('ArrowRight')
    const pays = page.getByRole('slider', { name: 'Number of payments' })
    await pays.focus()
    for (let i = 0; i < 11; i++) await pays.press('ArrowRight')
    await expect(S(page, 'l-installment')).toHaveText('₱1,134.72')
    await expect(S(page, 'l-eir')).toHaveText('2.00%')
  })

  test('utang cycle: borrowing again grows what is owed; paying yourself ends it', async ({ page }) => {
    const sim = S(page, 'cycle-sim')
    const cycles = sim.getByRole('slider', { name: 'Times you borrow again' })
    await cycles.focus()
    await cycles.press('ArrowLeft')
    await expect(S(page, 'c-cycles')).toHaveText('2')
    await expect(S(page, 'c-final')).toHaveText('₱7,145.83')
    await expect(S(page, 'c-cost')).toHaveText('₱2,645.83')
    await expect(S(page, 'c-rounds').getByRole('listitem')).toHaveCount(3)
    await sim.getByLabel('Your own money at each due date').fill('6,000')
    await expect(S(page, 'c-final')).toHaveText('₱0.00')
    await expect(sim).toContainText('Paid off')
  })

  test('credit card: minimum versus fixed versus higher payments, with a schedule', async ({ page }) => {
    const card = page.locator('#credit-card')
    await card.getByLabel('Outstanding balance').fill('10,000')
    await card.getByLabel('Minimum due').fill('5')
    await card.getByLabel('Fixed payment').fill('1,000')
    await expect(S(page, 'card-fixed-months')).toHaveText('1 yr 1 mo')
    const minInterest = await S(page, 'card-minimum-interest').textContent()
    const fixedInterest = await S(page, 'card-fixed-interest').textContent()
    const n = (s: string | null) => Number(s!.replace(/[₱,]/g, ''))
    expect(n(minInterest)).toBeGreaterThan(n(fixedInterest))
    await card.getByLabel('Minimum due').fill('2')
    await card.getByLabel('Or at least').fill('0')
    await expect(S(page, 'card-minimum-months')).toHaveText('Never at this rate')
    await page.getByRole('button', { name: /Month-by-month schedule/ }).click()
    await page.getByRole('group', { name: 'Schedule for', exact: true }).getByText('₱1,000 a month', { exact: true }).click()
    await expect(S(page, 'card-schedule-table').getByRole('row').nth(1)).toContainText('₱10,000.00')
    await expect(S(page, 'card-schedule-table').getByRole('row').nth(1)).toContainText('₱300.00')
  })

  test('installments: monthly burden and cash versus installment', async ({ page }) => {
    await expect(S(page, 'inst-total')).toHaveText('₱3,600.00')
    await expect(S(page, 'inst-pct')).toHaveText('14.4%')
    await expect(S(page, 'inst-left')).toHaveText('₱21,400.00')
    await expect(S(page, 'inst-remaining')).toHaveText('₱24,900.00')
    await page.getByRole('button', { name: 'Remove Gadget' }).click()
    await expect(S(page, 'inst-total')).toHaveText('₱2,700.00')
    await expect(S(page, 'cvi-total')).toHaveText('₱13,200.00')
    await expect(S(page, 'cvi-extra')).toHaveText('₱1,200.00')
    await expect(S(page, 'cvi-save')).toHaveText('11 months to pay cash')
  })

  test('kung inipon mo sana: contributions, 0% and compound scenarios', async ({ page }) => {
    await expect(S(page, 's-yearly')).toContainText('₱36,500')
    await expect(S(page, 's-contrib')).toHaveText('₱182,500.00')
    const ret = page.getByRole('slider', { name: 'Assumed return a year' })
    await ret.focus()
    await ret.press('Home')
    await expect(S(page, 's-return')).toHaveText('0%')
    await expect(S(page, 's-fv')).toHaveText('₱182,500.00')
    await expect(S(page, 's-growth')).toHaveText('₱0.00')
    await page.getByText('Monthly', { exact: true }).click()
    await page.getByLabel('Amount', { exact: true }).fill('1,000')
    const yrs = page.getByRole('slider', { name: 'For' })
    await yrs.focus()
    for (let i = 0; i < 5; i++) await yrs.press('ArrowRight')
    await expect(S(page, 's-fv')).toHaveText('₱120,000.00')
  })

  test('psychology concepts open with example and citation', async ({ page }) => {
    await page.getByRole('button', { name: /Minimum payment anchoring/ }).click()
    await expect(S(page, 'biases')).toContainText('Decide a fixed payment from your budget first')
  })

  for (const width of [390, 768, 1440]) {
    test(`no horizontal overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/mga-dapat-iwasan')
      await page.getByRole('button', { name: /Month-by-month schedule/ }).click()
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0)
    })
  }
})
