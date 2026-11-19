/*
 * PinansyalPH (https://pinansyalph.site/)
 * Copyright (c) 2026 Jervil Angelo De Leon. All rights reserved.
 *
 * This source code is proprietary to its author. Copying,
 * reproducing, modifying, distributing, publishing or reusing it, in whole or
 * in part, without the author's prior written permission is not allowed.
 * See the LICENSE file at the root of this repository.
 */

import { expect, test, type Page } from '@playwright/test'

/**
 * "Magkano ang Toll Ko?" Expected fares are TRB-approved rates confirmed by
 * independent reports (NLEX Jan 2026, SLEX/STAR Jul 2026, TPLEX), and the
 * multi-expressway totals match ExpresswayPH's published route guides.
 */

async function ready(page: Page) {
  await page.goto('/magkano-ang-toll')
  await page.waitForFunction(() => !document.getElementById('splash'))
}

async function pick(page: Page, which: 'Entry' | 'Exit', query: string, option: RegExp) {
  await page.getByRole('combobox', { name: new RegExp(which) }).fill(query)
  await page.getByRole('option', { name: option }).first().click()
}

const total = (page: Page) => page.getByTestId('toll-total')

test('shows an empty state with common trips', async ({ page }) => {
  await ready(page)
  await expect(page.getByRole('heading', { level: 1, name: 'Magkano ang Toll Ko?' })).toBeVisible()
  await expect(page.getByText('Know the toll fee before you travel.')).toBeVisible()
  await expect(page.getByTestId('toll-empty')).toBeVisible()
})

test('NLEX: Balintawak to Sta. Ines for each vehicle class', async ({ page }) => {
  await ready(page)
  await pick(page, 'Entry', 'balintawak', /^Balintawak, NLEX/)
  await pick(page, 'Exit', 'sta ines', /^Sta\. Ines/)
  await expect(total(page)).toHaveText('₱440')
  await page.getByText('Class 2', { exact: true }).click()
  await expect(total(page)).toHaveText('₱1,099')
  await page.getByText('Class 3', { exact: true }).click()
  await expect(total(page)).toHaveText('₱1,319')
})

test('NLEX open system: Balintawak to Marilao', async ({ page }) => {
  await ready(page)
  await pick(page, 'Entry', 'balintawak', /^Balintawak, NLEX/)
  await pick(page, 'Exit', 'marilao', /^Marilao/)
  await expect(total(page)).toHaveText('₱85')
})

test('NLEX to SCTEX is one integrated fare', async ({ page }) => {
  await ready(page)
  await pick(page, 'Entry', 'balintawak', /^Balintawak, NLEX/)
  await pick(page, 'Exit', 'subic', /^Tipo \(Subic\)/)
  await expect(total(page)).toHaveText('₱857')
  await expect(page.getByTestId('toll-breakdown').getByRole('listitem')).toHaveCount(2) // one leg + the exit row
})

test('NLEX → SCTEX → TPLEX: Manila to Baguio, with RFID split and the source', async ({ page }) => {
  await ready(page)
  await page.getByRole('button', { name: 'Manila → Baguio' }).click()
  await expect(total(page)).toHaveText('₱981')
  const breakdown = page.getByTestId('toll-breakdown')
  await expect(breakdown).toContainText('NLEX–SCTEX')
  await expect(breakdown).toContainText('₱670')
  await expect(breakdown).toContainText('TPLEX')
  await expect(breakdown).toContainText('₱311')
  await expect(page.getByTestId('rfid')).toContainText('Easytrip')
  await expect(page.getByTestId('rfid')).toContainText('Autosweep')
  await expect(page.getByTestId('toll-source')).toContainText('TRB rates effective')
})

test('SLEX → STAR: Alabang to Batangas City', async ({ page }) => {
  await ready(page)
  await pick(page, 'Entry', 'alabang', /^Alabang/)
  await pick(page, 'Exit', 'batangas', /^Batangas City/)
  await expect(total(page)).toHaveText('₱295') // ₱174 SLEX + ₱121 STAR
})

test('Skyway → SLEX: Skyway to Calamba', async ({ page }) => {
  await ready(page)
  await pick(page, 'Entry', 'skyway', /^Skyway \(elevated/)
  await pick(page, 'Exit', 'calamba', /^Calamba/)
  await expect(total(page)).toHaveText('₱301')
})

test('swapping gives the reverse trip, at the same fare', async ({ page }) => {
  await ready(page)
  await page.getByRole('button', { name: 'Manila → Baguio' }).click()
  await page.getByRole('button', { name: 'Swap entry and exit' }).click()
  await expect(page.getByRole('combobox', { name: /Entry/ })).toHaveValue(/^Rosario/)
  await expect(total(page)).toHaveText('₱981')
  await expect(page.getByTestId('toll-breakdown')).toContainText('Rosario → La Paz')
})

test('round trip doubles the fare and the RFID load', async ({ page }) => {
  await ready(page)
  await page.getByRole('button', { name: 'Manila → Baguio' }).click()
  await page.getByText('Balikan', { exact: true }).click()
  await expect(total(page)).toHaveText('₱1,962')
  await expect(page.getByTestId('rfid')).toContainText('₱1,340')
  await expect(page.getByTestId('rfid')).toContainText('₱622')
})

test('invalid trips explain why', async ({ page }) => {
  await ready(page)
  await pick(page, 'Entry', 'balintawak', /^Balintawak, NLEX/)
  await pick(page, 'Exit', 'kawit', /^Kawit/)
  await expect(page.getByTestId('toll-error')).toContainText('not connected')
  await pick(page, 'Entry', 'merville c5', /^Merville \(C5 Link\)/)
  await expect(page.getByTestId('toll-error')).toContainText('no published')
})

test('optional fuel cost adds to the toll', async ({ page }) => {
  await ready(page)
  await page.getByRole('button', { name: 'Manila → Baguio' }).click()
  await page.getByRole('button', { name: /Add fuel cost/ }).click()
  await page.getByLabel('Distance, one way').fill('250')
  await page.getByLabel('Fuel economy').fill('12.5')
  await page.getByLabel('Fuel price').fill('60')
  await expect(page.getByTestId('travel-total')).toHaveText('₱2,181.00') // ₱981 + 20 L × ₱60
})

test('saved routes persist across a reload and can be removed', async ({ page }) => {
  await ready(page)
  await page.getByRole('button', { name: 'Alabang → Batangas' }).click()
  await page.getByRole('button', { name: 'Save route' }).click()
  await page.reload()
  await page.waitForFunction(() => !document.getElementById('splash'))
  const saved = page.getByTestId('saved-routes')
  await expect(saved).toContainText('Alabang → Batangas City')
  await saved.getByRole('button', { name: /^Alabang → Batangas City/ }).click()
  await expect(total(page)).toHaveText('₱295')
  await saved.getByRole('button', { name: /Remove/ }).click()
  await expect(page.getByTestId('saved-routes')).toHaveCount(0)
})

for (const width of [320, 390, 768, 1440]) {
  test(`no horizontal overflow with a result at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await ready(page)
    await page.getByRole('button', { name: 'Manila → Baguio' }).click()
    await page.getByText('Balikan', { exact: true }).click()
    await expect(total(page)).toHaveText('₱1,962')
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0)
  })
}

test('is listed in the Tools menu and opens directly', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/')
  await page.waitForFunction(() => !document.getElementById('splash'))
  await page.getByRole('button', { name: 'Tools' }).click()
  await page.locator('#tools-menu').getByRole('link', { name: /^Toll/ }).click()
  await expect(page).toHaveURL(/\/magkano-ang-toll$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Magkano ang Toll Ko?' })).toBeVisible()
})
