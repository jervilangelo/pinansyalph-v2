import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { parseSync } from 'rolldown/utils'
import { afterEach, describe, expect, it } from 'vitest'
import ceb from '../i18n/ceb.json'
import en from '../i18n/en.json'
import fil from '../i18n/fil.json'
import patterns from '../i18n/patterns.json'
import { registerCatalog, setCurrentLang, t, tn, tv } from '../i18n'
import { TAGLINE } from '../site'

type Catalog = Record<string, string>
const SRC = resolve(__dirname, '..')

/** Every literal key passed to t(), tx() and tn() anywhere in src. */
function sourceKeys(): Map<string, string> {
  const keys = new Map<string, string>()
  const files = (dir: string): string[] =>
    readdirSync(dir).flatMap((n) => {
      const p = join(dir, n)
      if (statSync(p).isDirectory()) return n === '__tests__' || n === 'i18n' ? [] : files(p)
      return /\.tsx?$/.test(n) && !/\.d\.ts$/.test(n) ? [p] : []
    })
  const walk = (node: unknown, fn: (n: Record<string, any>) => void) => {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) return node.forEach((n) => walk(n, fn))
    const n = node as Record<string, any>
    if (typeof n.type === 'string') fn(n)
    for (const k of Object.keys(n)) if (k !== 'type' && n[k] && typeof n[k] === 'object') walk(n[k], fn)
  }
  for (const f of files(SRC)) {
    const { program } = parseSync(f, readFileSync(f, 'utf8'), { lang: f.endsWith('.tsx') ? 'tsx' : 'ts' })
    walk(program, (n) => {
      if (n.type !== 'CallExpression' || n.callee?.type !== 'Identifier' || !/^(t|tx|tn)$/.test(n.callee.name)) return
      for (const i of n.callee.name === 'tn' ? [1, 2] : [0]) {
        const a = n.arguments[i]
        if (a?.type === 'Literal' && typeof a.value === 'string' && a.value.trim()) keys.set(a.value.trim(), f.slice(SRC.length + 1))
      }
    })
  }
  return keys
}

const placeholders = (s: string) => [...new Set((s.match(/\{(\w+)\}/g) ?? []).map((m) => m.slice(1, -1)))].sort()
/** Placeholder names a key allows, with repeats numbered ({name} {name} → name, name2). */
const allowed = (key: string) => {
  const out: string[] = []
  for (const m of key.match(/\{(\w+)\}/g) ?? []) {
    const base = m.slice(1, -1)
    let n = base
    for (let i = 2; out.includes(n); i++) n = `${base}${i}`
    out.push(n)
  }
  return out
}

afterEach(() => setCurrentLang('en'))

describe('translation catalogs', () => {
  const keys = sourceKeys()

  it.each([
    ['fil', fil as Catalog],
    ['ceb', ceb as Catalog],
  ])('%s has a translation for every key used in the code', (_l, cat) => {
    const missing = [...keys].filter(([k]) => !(k in cat)).map(([k, f]) => `${f}: ${k}`)
    expect(missing).toEqual([])
  })

  it.each([
    ['fil', fil as Catalog],
    ['ceb', ceb as Catalog],
    ['en', en as Catalog],
  ])('%s translations keep the placeholders of their keys', (_l, cat) => {
    const bad = Object.entries(cat).filter(([k, v]) => {
      const got = placeholders(v)
      return got.some((p) => !allowed(k).includes(p) && !placeholders(k).includes(p))
    })
    expect(bad).toEqual([])
  })

  it('pattern keys exist in both catalogs', () => {
    const cats = [fil, ceb] as Catalog[]
    expect((patterns as string[]).filter((k) => cats.some((c) => !(k in c)))).toEqual([])
  })

  it('never translates or rewords the official tagline', () => {
    expect(TAGLINE).toBe('Tamang Pinansyal para sa mga Pilipino.')
    for (const cat of [fil, ceb, en] as Catalog[]) {
      if (TAGLINE in cat) expect(cat[TAGLINE]).toBe(TAGLINE)
      expect(Object.values(cat).join('\n')).not.toMatch(/Mas malinaw ang pera mo/i)
    }
  })

  it('does not market the project as open source', () => {
    for (const cat of [fil, ceb, en] as Catalog[]) {
      const all = Object.entries(cat).flat().join('\n')
      expect(all).not.toMatch(/open[- ]?source/i)
    }
  })

  it('keeps the brand name and the copyright line unchanged', () => {
    for (const cat of [fil, ceb] as Catalog[]) {
      for (const v of Object.values(cat)) expect(v).not.toMatch(/Pinansyal PH|PinansyalPh/)
      expect(cat['© 2026 PinansyalPH. All rights reserved.'] ?? '© 2026 PinansyalPH. All rights reserved.').toBe('© 2026 PinansyalPH. All rights reserved.')
    }
  })
})

describe('t()', () => {
  it('returns English source text by default, and falls back to it for unknown keys', () => {
    expect(t('Settings')).toBe('Settings')
    registerCatalog('fil', fil as Catalog)
    setCurrentLang('fil')
    expect(t('Settings')).toBe('Mga Setting')
    expect(t('A sentence no catalog has.')).toBe('A sentence no catalog has.')
  })

  it('fills placeholders and translates each language', () => {
    registerCatalog('ceb', ceb as Catalog)
    setCurrentLang('ceb')
    expect(t('Developed by {name}', { name: 'Jervil Angelo De Leon' })).toBe('Gihimo ni Jervil Angelo De Leon')
    expect(t('Language')).toBe('Pinulongan')
    expect(t('About PinansyalPH')).toBe('Mahitungod sa PinansyalPH')
  })

  it('translates messages built by calculator modules through pattern keys', () => {
    registerCatalog('fil', fil as Catalog)
    setCurrentLang('fil')
    expect(t('Choose a year from 2020 to 2026.')).toBe('Pumili ng taon mula 2020 hanggang 2026.')
    // Captured words are translated too.
    expect(t('Your billing period is 35 days, longer than the usual month, so the kWh covers more days. The rates still apply per kWh.')).toContain('mas mahaba')
  })

  it('keeps spaces around fragments and leaves non-text values alone', () => {
    registerCatalog('fil', fil as Catalog)
    setCurrentLang('fil')
    expect(t(' Settings ')).toBe(' Mga Setting ')
    expect(tv(42)).toBe(42)
    expect(tn(1, '{n} match', '{n} matches')).toBe('1 tugma')
  })

  it('uses English overrides for source text written in Taglish', () => {
    setCurrentLang('en')
    registerCatalog('en', en as Catalog)
    expect(t('Ano ang 13th month pay?')).toBe('What is 13th month pay?')
  })
})
