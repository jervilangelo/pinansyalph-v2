/**
 * Translations for English (default), Filipino and Bisaya / Cebuano.
 *
 * Keys are the English source text, so code reads naturally and English needs
 * no catalog: `t('Monthly payment')`. fil.json and ceb.json map each English
 * string to its translation; en.json can override English copy. A missing
 * translation falls back to English, never to a raw key.
 *
 * Placeholders: `t('Pay {amount} a month', { amount: peso(x) })`.
 *
 * Calculator modules keep producing English messages (they are shared with the
 * tests and the data scripts). Their interpolated messages are matched against
 * pattern keys at display time: the catalog key
 * "Choose a year from {0} to {1}." translates "Choose a year from 2020 to 2026."
 * without changing any calculation code.
 *
 * This module has no React dependency, so it also works in Node (tests, build).
 */
import en from './en.json'
import patternList from './patterns.json'

/**
 * Only messages built by non-React modules (calculators, data, module-level
 * templates) are matched by pattern. Component text always passes its values
 * explicitly, so general patterns can never rewrite unrelated English.
 * Regenerated with the catalog extractor; see src/__tests__/i18n.test.ts.
 */
const PATTERN_KEYS = new Set<string>(patternList)

export type Lang = 'fil' | 'en' | 'ceb'
export type Vars = Record<string, string | number>
type Catalog = Record<string, string>

export const LANGS: { id: Lang; label: string; html: string }[] = [
  { id: 'en', label: 'English', html: 'en-PH' },
  { id: 'fil', label: 'Filipino', html: 'fil' },
  { id: 'ceb', label: 'Bisaya', html: 'ceb' },
]
export const DEFAULT_LANG: Lang = 'en'
export const LANG_STORAGE_KEY = 'pinansyalph-language'

export const isLang = (v: unknown): v is Lang => v === 'fil' || v === 'en' || v === 'ceb'
export const htmlLang = (l: Lang) => LANGS.find((x) => x.id === l)!.html

const catalogs: Partial<Record<Lang, Catalog>> = { en: en as Catalog }
const loaders: Record<Lang, () => Promise<{ default: Catalog }>> = {
  en: async () => ({ default: en as Catalog }),
  fil: () => import('./fil.json') as Promise<{ default: Catalog }>,
  ceb: () => import('./ceb.json') as Promise<{ default: Catalog }>,
}

// Node (tests, scripts) reads English source text until a language is chosen.
let current: Lang = 'en'

/** Load a language's catalog (cached). */
export async function loadLang(l: Lang): Promise<void> {
  if (!catalogs[l]) catalogs[l] = (await loaders[l]()).default
}

/** Provide a catalog directly (tests and the build). */
export function registerCatalog(l: Lang, c: Catalog) {
  catalogs[l] = c
  patterns.delete(l)
  cache.delete(l)
}

export function setCurrentLang(l: Lang) {
  current = catalogs[l] ? l : 'en'
}
export const currentLang = () => current

// ----- lookup -------------------------------------------------------------

type Pattern = { re: RegExp; names: string[]; key: string }
const patterns = new Map<Lang, Pattern[]>()
const cache = new Map<Lang, Map<string, string | null>>()
const PH = /\{(\w+)\}/g
const HAS_PH = /\{\w+\}/
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function patternsFor(l: Lang, c: Catalog): Pattern[] {
  let list = patterns.get(l)
  if (!list) {
    list = Object.keys(c)
      .filter((k) => HAS_PH.test(k) && PATTERN_KEYS.has(k))
      .map((key) => {
        const names: string[] = []
        const body = key
          .split(PH)
          .map((part, i) => {
            if (i % 2 === 1) {
              // A repeated placeholder ("{name} and {name}") is numbered in translations: {name}, {name2}, …
              let nm = part
              for (let n = 2; names.includes(nm); n++) nm = `${part}${n}`
              names.push(nm)
              return '([\\s\\S]+?)'
            }
            return escapeRe(part)
          })
          .join('')
        return { re: new RegExp(`^${body}$`), names, key }
      })
      // Most specific (longest literal text) first.
      .sort((a, b) => b.key.replace(PH, '').length - a.key.replace(PH, '').length)
    patterns.set(l, list)
  }
  return list
}

const fill = (s: string, vars?: Vars) => (vars ? s.replace(PH, (m, k: string) => (k in vars ? String(vars[k]) : m)) : s)

/** Translation of `src` in language `l`, or null when the catalog has none. */
function lookup(l: Lang, src: string): string | null {
  const c = catalogs[l]
  if (!c) return null
  const hit = c[src]
  if (hit !== undefined) return hit
  let memo = cache.get(l)
  if (!memo) cache.set(l, (memo = new Map()))
  if (memo.has(src)) return memo.get(src)!
  let out: string | null = null
  // Only finished text (no {placeholders} left) is matched against pattern keys.
  if (!HAS_PH.test(src)) {
    for (const p of patternsFor(l, c)) {
      const m = p.re.exec(src)
      if (!m) continue
      const vars: Vars = {}
      p.names.forEach((n, i) => (vars[n] = translate(m[i + 1])))
      out = fill(c[p.key], vars)
      break
    }
  }
  memo.set(src, out)
  return out
}

/** A captured value is itself translated when the catalog knows it ("Car" → "Kotse"). */
function translate(s: string): string {
  return (current !== 'en' && catalogs[current]?.[s]) || s
}

/** Translate English source text into the current language. */
export function t(src: string, vars?: Vars): string {
  if (typeof src !== 'string' || !src) return src
  // Keys are stored trimmed; spaces around a fragment (" Real return: …") are kept as they are.
  const lead = src.length - src.trimStart().length
  const trail = src.length - src.trimEnd().length
  if (lead || trail) return src.slice(0, lead) + t(src.trim(), vars) + src.slice(src.length - trail)
  const found = current !== 'en' ? lookup(current, src) : null
  const out = fill(found ?? catalogs.en?.[src] ?? src, vars)
  // QA aid (tests only): mark translated text, and flag text with no translation.
  if (typeof window !== 'undefined' && (window as { __PP_I18N_DEBUG__?: boolean }).__PP_I18N_DEBUG__) return found === null && current !== 'en' ? `⟦?${out}?⟧` : `⟦${out}⟧`
  return out
}

/**
 * Translate a value that may be text: labels and messages that come from data
 * and calculator modules. Anything that is not a string (numbers, elements) is
 * returned unchanged.
 */
export function tv<T>(v: T): T {
  return (typeof v === 'string' ? t(v) : v) as T
}

/** Plural: picks the English singular or plural key, then translates it. `{n}` is the count. */
export function tn(n: number, one: string, other: string, vars?: Vars): string {
  return t(n === 1 ? one : other, { n: n.toLocaleString('en-PH'), ...vars })
}

/** True when the current language has its own text for `src` (used by the catalog tests). */
export function hasTranslation(l: Lang, src: string): boolean {
  return l === 'en' || lookup(l, src) !== null
}
