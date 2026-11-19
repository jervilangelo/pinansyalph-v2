/*
 * PinansyalPH (https://pinansyalph.site/)
 * Copyright (c) 2026 Jervil Angelo De Leon. All rights reserved.
 *
 * This source code is proprietary to its author. Copying,
 * reproducing, modifying, distributing, publishing or reusing it, in whole or
 * in part, without the author's prior written permission is not allowed.
 * See the LICENSE file at the root of this repository.
 */

import { describe, expect, it } from 'vitest'
import { PAGES, ROUTES, SITE_ORIGIN, canonicalUrl, normalizePath } from '../routes'

describe('normalizePath', () => {
  it.each([
    ['/', '/'],
    ['', '/'],
    ['/index.html', '/'],
    ['/mp2', '/mp2'],
    ['/mp2/', '/mp2'],
    ['/mp2.html', '/mp2'],
    ['/mp2/index.html', '/mp2'],
    ['/pinansyalph-v2', '/'],
    ['/pinansyalph-v2/', '/'],
    ['/pinansyalph-v2/index.html', '/'],
    ['/pinansyalph-v2/mp2', '/mp2'],
    ['/pinansyalph-v2/mp2/', '/mp2'],
    ['/pinansyalph-v2/13th-month.html', '/13th-month'],
  ])('%s → %s', (input, expected) => {
    expect(normalizePath(input)).toBe(expected)
  })

  it('leaves look-alike paths alone', () => {
    expect(normalizePath('/pinansyalph-v2x/mp2')).toBe('/pinansyalph-v2x/mp2')
  })
})

describe('canonical URLs', () => {
  it('use the custom domain, with no trailing slash except the homepage', () => {
    expect(SITE_ORIGIN).toBe('https://pinansyalph.site')
    expect(canonicalUrl('/')).toBe('https://pinansyalph.site/')
    expect(canonicalUrl('/mp2')).toBe('https://pinansyalph.site/mp2')
  })

  it('cover every page, and every page is a route', () => {
    expect(PAGES.map((p) => p.path).sort()).toEqual(ROUTES.filter((r) => r !== '/').sort())
    for (const r of ROUTES) expect(normalizePath(r)).toBe(r)
  })
})
