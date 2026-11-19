import { expect, test, type Page } from '@playwright/test'

/** Sulit Ba Internet Ko?, Magkano Konsumo Ko?, the tool dock, the homepage constellation and the About page. */

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
})

/* ------------------------------------------------------------------ */
/* Sulit Ba Internet Ko?                                                */
/* ------------------------------------------------------------------ */

const provider = (p: Page) => p.getByLabel('Provider', { exact: true })
const plan = (p: Page) => p.getByLabel('Plan', { exact: true })

test.describe('Sulit Ba Internet Ko?', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/sulit-internet')
  })

  test('heading, subtitle and source status', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Sulit Ba Internet Ko?')
    await expect(page.locator('main')).toContainText('Is your internet really worth it, or is there something cheaper and faster?')
    await expect(page.locator('main')).toContainText('Prices from each provider’s own page')
  })

  test('picking a plan fills the bill and speed; ₱ per Mbps = bill ÷ speed', async ({ page }) => {
    await provider(page).selectOption('converge')
    await plan(page).selectOption('converge-1500')
    await expect(page.getByLabel('What you actually pay a month')).toHaveValue('1,500')
    await expect(page.getByTestId('advertised-value')).toHaveText('300 Mbps')
    await expect(page.getByTestId('your-per-mbps')).toHaveText('₱5.00')
    await expect(page.getByTestId('plan-note')).toContainText('Verified on Converge’s own page')
    // The example from the brief: ₱1,500 for 200 Mbps is ₱7.50 per Mbps.
    await page.getByLabel('Advertised download speed, exact value').fill('200')
    await expect(page.getByTestId('your-per-mbps')).toHaveText('₱7.50')
    await expect(page.getByTestId('your-annual')).toHaveText('₱18,000.00')
  })

  test('am I overpaying: compared with verified plans only, with faster plans for less', async ({ page }) => {
    await provider(page).selectOption('custom')
    await page.getByLabel('What you actually pay a month').fill('1,700')
    await page.getByLabel('Advertised download speed, exact value').fill('200')
    await expect(page.getByTestId('overpay-message')).toContainText('Your current plan costs ₱8.50 per Mbps')
    await expect(page.getByTestId('overpay-message')).toContainText('verified plans listed here offer a lower price per Mbps')
    await expect(page.getByTestId('faster-for-less').getByRole('listitem').first()).toBeVisible()
    await expect(page.getByTestId('faster-for-less')).not.toContainText('WOWFi')
  })

  test('measured speed gives a second ₱ per Mbps', async ({ page }) => {
    await provider(page).selectOption('custom')
    await page.getByLabel('What you actually pay a month').fill('1,500')
    await page.getByLabel('Advertised download speed, exact value').fill('300')
    await page.getByText('I measured my actual speed').click()
    await page.getByLabel('Measured download speed, exact value').fill('150')
    await expect(page.getByTestId('your-actual-per-mbps')).toHaveText('₱10.00')
  })

  test('prepaid loads, promos and installation feed the side-by-side costs', async ({ page }) => {
    await page.getByRole('checkbox', { name: 'Compare Globe GFiber 1499 Unli' }).check()
    await page.getByRole('checkbox', { name: 'Compare PLDT Fiber Prepaid 100 Mbps, 30-day load' }).check()
    const table = page.getByTestId('side-by-side')
    await expect(table).toContainText('GFiber 1499 Unli')
    // GFiber: ₱1 + 12 × (₱1,499 + ₱100 installation) = ₱19,189.
    await expect(table).toContainText('₱19,189.00')
    await expect(table).toContainText('+ ₱2,400.00 over 24 months')
    // PLDT prepaid 100 Mbps: ₱999 × 365 ÷ 30 ÷ 12 = ₱1,012.88 a month; first month free with the ₱1,699 fee.
    await expect(table).toContainText('₱1,012.88')
    await expect(table).toContainText('₱12,840.63')
    await expect(page.getByTestId('upfront-vs-longterm')).toContainText('₱1,699.00 upfront')
  })

  test('sorting by highest speed and lowest monthly price', async ({ page }) => {
    await page.getByLabel('Sort by').selectOption('speed')
    await expect(page.getByTestId('plan-row').first()).toContainText('1 Gbps')
    await page.getByLabel('Sort by').selectOption('price')
    const first = await page.getByTestId('plan-row').first().textContent()
    expect(first).toContain('Fiber Prepaid 50 Mbps, 365-day load')
    await page.getByLabel('Sort by').selectOption('perMbps')
    await expect(page.getByTestId('plan-row').first()).toContainText('Best value per Mbps')
  })

  test('announced plans are hidden until asked for, and labelled', async ({ page }) => {
    await expect(page.getByTestId('plan-list')).not.toContainText('WOWFi')
    await page.getByText('Include plans from older announcements').click()
    await expect(page.getByTestId('plan-list')).toContainText('Home WOWFi 5G')
    await expect(page.getByTestId('plan-list')).toContainText('Announced 2024')
  })

  test('custom plan, saved comparison, and both survive a reload', async ({ page }) => {
    await page.getByRole('button', { name: 'Add a plan that is not listed' }).click()
    const form = page.getByTestId('custom-plan-form')
    await form.getByLabel('Provider and plan name').fill('Streamtech 200')
    await form.getByLabel('Monthly price').fill('1,299')
    await form.getByLabel('Download speed, exact value').fill('200')
    await form.getByLabel('One-time fees (installation, modem)').fill('1,000')
    await form.getByRole('button', { name: 'Add to the comparison' }).click()
    await expect(page.getByTestId('side-by-side')).toContainText('Streamtech 200')
    await expect(page.getByTestId('side-by-side')).toContainText('₱6.50/Mbps')
    await page.getByLabel('Name', { exact: true }).fill('Apartment')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByTestId('saved-comparisons')).toContainText('Apartment')
    await page.reload()
    await expect(page.getByTestId('saved-comparisons')).toContainText('Apartment')
    await expect(page.getByTestId('side-by-side')).toContainText('Streamtech 200')
  })

  test('location: no false coverage claims', async ({ page }) => {
    await page.getByRole('combobox', { name: 'Your city or municipality' }).fill('quezon')
    await page.getByRole('option', { name: /^Quezon City/ }).click()
    await expect(page.getByTestId('location-result')).toContainText('We could not verify which plans reach Quezon City')
  })
})

/* ------------------------------------------------------------------ */
/* Magkano Konsumo Ko?                                                  */
/* ------------------------------------------------------------------ */

test.describe('Magkano Konsumo Ko?', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/magkano-konsumo')
    await page.getByRole('group', { name: 'Rate', exact: true }).getByText('My own rate', { exact: true }).click()
    await page.getByLabel('Rate per kWh, exact value').fill('12')
  })

  async function addFan(page: Page) {
    await page.getByRole('combobox', { name: 'Appliance' }).fill('fan')
    await page.getByRole('option', { name: /^Electric fan/ }).click()
    await page.getByLabel('Size or kind').selectOption('stand')
  }

  test('heading and subtitle', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Magkano Konsumo Ko?')
    await expect(page.locator('main')).toContainText('Find out how much electricity your appliances use.')
  })

  test('wattage preset, hours and days: kWh = W × h × days ÷ 1,000', async ({ page }) => {
    await addFan(page)
    await expect(page.getByTestId('watts-value')).toHaveText('55 W')
    // 55 W × 8 h × 30 days = 13.2 kWh; × ₱12 = ₱158.40.
    await expect(page.getByTestId('preview-month-kwh')).toHaveText('13.2 kWh')
    await expect(page.getByTestId('preview-month-cost')).toHaveText('₱158.40')
    await page.getByLabel('Rated wattage, exact value').fill('100')
    await expect(page.getByTestId('preview-month-kwh')).toHaveText('24 kWh')
    const hours = page.getByRole('slider', { name: 'Hours a day' })
    await hours.focus()
    for (let i = 0; i < 4; i++) await hours.press('ArrowRight')
    await expect(page.getByTestId('hours-value')).toHaveText('9 hrs')
    await expect(page.getByTestId('preview-month-kwh')).toHaveText('27 kWh')
    await page.getByRole('button', { name: 'One unit more' }).click()
    await expect(page.getByTestId('preview-month-kwh')).toHaveText('54 kWh')
    await page.getByRole('button', { name: 'Add to my household' }).click()
    await expect(page.getByTestId('konsumo-monthly-cost')).toHaveText('₱648.00')
    await expect(page.getByTestId('konsumo-annual-cost')).toHaveText('₱7,776.00')
  })

  test('energy-label kWh for a refrigerator', async ({ page }) => {
    await page.getByRole('combobox', { name: 'Appliance' }).fill('ref')
    await page.getByRole('option', { name: /^Refrigerator/ }).click()
    await page.getByRole('group', { name: 'Estimate from', exact: true }).getByText('Energy label kWh', { exact: true }).click()
    await page.getByLabel('kWh on the energy label').fill('365')
    await expect(page.getByTestId('preview-month-cost')).toHaveText('₱365.00')
  })

  test('household dashboard, edit, duplicate, remove, and persistence', async ({ page }) => {
    await page.getByRole('button', { name: /Add aircon, ref, electric fan and TV/ }).click()
    await expect(page.getByTestId('appliance-row')).toHaveCount(4)
    // Aircon 108 + ref 34.56 + fan 13.2 + TV 10.5 = 166.26 kWh × ₱12 = ₱1,995.12.
    await expect(page.getByTestId('konsumo-monthly-kwh')).toHaveText('166.26 kWh')
    await expect(page.getByTestId('konsumo-monthly-cost')).toHaveText('₱1,995.12')
    await expect(page.getByTestId('konsumo-highest')).toContainText('Aircon, inverter')
    await expect(page.getByTestId('konsumo-lowest')).toContainText('Television')
    await expect(page.getByTestId('konsumo-breakdown').getByRole('row', { name: /Aircon/ })).toContainText('65.0%')

    await page.getByRole('button', { name: 'Duplicate Electric fan (Stand fan, 16-inch)' }).click()
    await expect(page.getByTestId('appliance-row')).toHaveCount(5)
    await page.getByRole('button', { name: 'Remove Electric fan (Stand fan, 16-inch) (copy)' }).click()
    await expect(page.getByTestId('appliance-row')).toHaveCount(4)

    await page.getByRole('button', { name: 'Edit Television, LED (43-inch)' }).click()
    await page.getByLabel('Rated wattage, exact value').fill('140')
    await page.getByRole('button', { name: 'Save changes' }).click()
    // TV doubles: +10.5 kWh = 176.76 kWh.
    await expect(page.getByTestId('konsumo-monthly-kwh')).toHaveText('176.76 kWh')

    await page.reload()
    await expect(page.getByTestId('appliance-row')).toHaveCount(4)
    await expect(page.getByTestId('konsumo-monthly-kwh')).toHaveText('176.76 kWh')
    await expect(page.getByTestId('rate-value')).toHaveText('₱12.00/kWh')
  })

  test('what if I reduce usage: AC from 8 to 5 hours', async ({ page }) => {
    await page.getByRole('button', { name: /Add aircon, ref, electric fan and TV/ }).click()
    const ac = page.getByTestId('reduce-sim').getByRole('slider', { name: 'Aircon, inverter (1 HP)' })
    await ac.focus()
    for (let i = 0; i < 12; i++) await ac.press('ArrowLeft')
    // 108 → 67.5 kWh: 40.5 kWh × ₱12 = ₱486 a month, ₱5,832 a year.
    await expect(page.getByTestId('reduce-monthly')).toHaveText('₱486.00')
    await expect(page.getByTestId('reduce-annual')).toHaveText('₱5,832.00')
    await expect(page.getByTestId('reduce-before')).toHaveText('166.3 kWh/mo')
    await expect(page.getByTestId('reduce-after')).toHaveText('125.8 kWh/mo')
    await expect(page.getByTestId('reduce-pct')).toHaveText('24.4%')
    // The household list is unchanged.
    await expect(page.getByTestId('konsumo-monthly-kwh')).toHaveText('166.26 kWh')
  })

  test('utility rates show their source and period', async ({ page }) => {
    await page.getByRole('group', { name: 'Rate', exact: true }).getByText('Meralco', { exact: true }).click()
    await expect(page.getByTestId('rate-source')).toContainText('Indicative Meralco residential rate')
    await expect(page.getByTestId('rate-source')).toContainText('Not your exact rate')
    await page.getByRole('group', { name: 'Rate', exact: true }).getByText('Visayan Electric', { exact: true }).click()
    await expect(page.getByTestId('rate-value')).toHaveText('₱14.89/kWh')
    await expect(page.getByTestId('rate-source')).toContainText('September 2026 billing')
  })

  test('rejects impossible input', async ({ page }) => {
    await addFan(page)
    await page.getByLabel('Rated wattage, exact value').fill('0')
    await page.getByRole('button', { name: 'Add to my household' }).click()
    await expect(page.getByTestId('appliance-form').getByRole('alert').last()).toContainText(/Watts|Use 1 or more/)
  })
})

/* ------------------------------------------------------------------ */
/* Navigation, homepage, About                                          */
/* ------------------------------------------------------------------ */

test.describe('tool dock and homepage', () => {
  test('desktop dock lists every tool, marks the active one, and navigates', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/magkano-konsumo')
    const dock = page.getByTestId('tool-dock')
    await expect(dock.getByRole('link')).toHaveCount(16)
    await expect(dock.getByRole('link', { name: 'Magkano Konsumo Ko?' })).toHaveAttribute('aria-current', 'page')
    await dock.getByRole('link', { name: 'Sulit Ba Internet Ko?' }).hover()
    await expect(page.getByRole('tooltip')).toContainText('Sulit Ba Internet Ko?')
    await dock.getByRole('link', { name: 'Sulit Ba Internet Ko?' }).click()
    await expect(page).toHaveURL(/\/sulit-internet$/)
    await expect(dock.getByRole('link', { name: 'Sulit Ba Internet Ko?' })).toHaveAttribute('aria-current', 'page')
  })

  test('phone launcher opens a sheet of all tools and closes with Escape', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    await page.getByTestId('tool-launcher').click()
    const sheet = page.getByTestId('tool-sheet')
    await expect(sheet.getByRole('link')).toHaveCount(15)
    await page.keyboard.press('Escape')
    await expect(sheet).toHaveCount(0)
    await page.getByTestId('tool-launcher').click()
    await sheet.getByRole('link', { name: 'Konsumo' }).click()
    await expect(page).toHaveURL(/\/magkano-konsumo$/)
  })

  test('homepage constellation: every tool, readable on focus, opens the tool', async ({ page }) => {
    await page.goto('/')
    const marks = page.getByTestId('constellation-mark')
    await expect(marks).toHaveCount(14)
    await marks.nth(13).focus()
    await expect(page.getByTestId('constellation-caption')).toContainText(/Konsumo|Internet|Subscription/)
    await page.getByRole('link', { name: /^Sulit Ba Internet Ko\?:/ }).click()
    await expect(page).toHaveURL(/\/sulit-internet$/)
  })

  for (const width of [390, 768, 1440]) {
    test(`new pages do not overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      for (const path of ['/', '/sulit-internet', '/magkano-konsumo', '/about']) {
        await page.goto(path)
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
        expect(overflow, path).toBeLessThanOrEqual(0)
      }
    })
  }
})

test.describe('About', () => {
  test('toolkit, privacy disclosures, disclaimer and contact links', async ({ page }) => {
    await page.goto('/about')
    await expect(page.getByRole('heading', { name: 'An all-in-one Filipino financial toolkit' })).toBeVisible()
    await expect(page.locator('main').getByRole('link', { name: 'Report an issue', exact: true })).toHaveAttribute('href', 'mailto:deleonangelojervil@gmail.com')
    await expect(page.getByRole('heading', { name: 'Your data stays yours' })).toBeVisible()
    await expect(page.getByTestId('stored-list')).toContainText('Sulit Ba Internet Ko?')
    await expect(page.locator('main')).toContainText('Google Fonts')
    await expect(page.getByTestId('pricing-disclaimer')).toContainText('not as final or authoritative quotations')
    await page.getByRole('button', { name: 'Connect with me' }).click()
    const panel = page.getByTestId('connect-panel')
    await expect(panel.getByRole('link', { name: /Email/ })).toHaveAttribute('href', 'mailto:deleonangelojervil@gmail.com')
    await expect(panel.getByRole('link', { name: /LinkedIn/ })).toHaveAttribute('href', 'https://www.linkedin.com/in/jervilangelo/')
    await expect(panel.getByRole('link', { name: /GitHub/ })).toHaveAttribute('href', 'https://github.com/jervilangelo')
    await expect(panel.getByRole('link', { name: /Portfolio/ })).toHaveAttribute('href', 'https://jervilangelo.online/')
    await page.keyboard.press('Escape')
    await expect(panel).toHaveCount(0)
  })
})
