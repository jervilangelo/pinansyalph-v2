import { expect, test, type Page } from '@playwright/test'

/** "Mga Dapat Iwasan": the red, far-right toolbar entry and the page's simulators. */

const S = (page: Page, id: string) => page.getByTestId(id)

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
})

test.describe('share button', () => {
  for (const width of [1024, 1440, 1920]) {
    test(`sits just before the settings button, rightmost, and overlaps nothing at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/')
      const nav = page.getByRole('navigation', { name: 'Main' })
      const items = nav.locator('a:visible, button:visible')
      const n = await items.count()
      await expect(items.nth(n - 1)).toHaveAttribute('data-testid', 'settings-button')
      await expect(items.nth(n - 2)).toHaveAttribute('data-testid', 'share-button')
      const boxes = await Promise.all(Array.from({ length: n }, (_, i) => items.nth(i).boundingBox()))
      for (let i = 1; i < n; i++) expect(boxes[i]!.x).toBeGreaterThanOrEqual(boxes[i - 1]!.x + boxes[i - 1]!.width - 1)
      expect(boxes[n - 1]!.x + boxes[n - 1]!.width).toBeLessThanOrEqual(width)
      await expect(nav.getByTestId('iwasan-nav')).toHaveCount(0)
    })
  }

  test('opens with Facebook, Messenger, Instagram and Copy link; keyboard and Escape work', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/magkano-konsumo')
    const btn = S(page, 'share-button')
    await btn.focus()
    await page.keyboard.press('Enter')
    const panel = S(page, 'share-panel')
    await expect(panel).toBeVisible()
    for (const id of ['share-facebook', 'share-messenger', 'share-instagram', 'share-copy']) await expect(S(page, id)).toBeVisible()

    const [fb] = await Promise.all([page.waitForEvent('popup'), S(page, 'share-facebook').click()])
    expect(fb.url()).toContain('facebook.com')
    expect(decodeURIComponent(fb.url())).toContain('/magkano-konsumo')
    await fb.close()

    await S(page, 'share-copy').click()
    await expect(S(page, 'share-status')).toHaveText('Link copied.')
    expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/\/magkano-konsumo$/)

    // On a computer, Messenger copies the link and opens Messenger to paste it.
    const [msg] = await Promise.all([page.waitForEvent('popup'), S(page, 'share-messenger').click()])
    expect(msg.url()).toContain('messenger.com')
    await msg.close()
    await expect(S(page, 'share-status')).toContainText('Paste it into your Messenger chat')

    await page.keyboard.press('Escape')
    await expect(panel).toHaveCount(0)
    await expect(btn).toBeFocused()
  })

  for (const width of [320, 390, 768]) {
    test(`fits as an icon button on smaller screens at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 })
      await page.goto('/')
      const btn = S(page, 'share-button-compact')
      await expect(btn).toBeVisible()
      await expect(btn).toHaveAccessibleName('Share this page')
      await btn.click()
      const box = (await S(page, 'share-panel').boundingBox())!
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(width)
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0)
    })
  }

  test('Mga Dapat Iwasan is still reachable from the phone menu, the dock and the footer', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/')
    await expect(page.getByTestId('tool-dock').getByRole('link', { name: 'Mga Dapat Iwasan' })).toBeVisible()
    await expect(page.getByRole('contentinfo').getByRole('link', { name: 'Mga Dapat Iwasan' })).toHaveAttribute('href', /mga-dapat-iwasan$/)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.getByRole('button', { name: 'Open menu' }).click()
    await S(page, 'iwasan-mobile-link').click()
    await expect(page).toHaveURL(/\/mga-dapat-iwasan$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Mga Dapat Iwasan')
  })
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
