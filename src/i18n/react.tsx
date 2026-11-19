import { Fragment, createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { LANG_STORAGE_KEY, currentLang, htmlLang, loadLang, setCurrentLang, t, tn, type Lang, type Vars } from './index'
import { writePref } from '../prefs'

type Ctx = { lang: Lang; setLang: (l: Lang) => Promise<void> }
const I18nContext = createContext<Ctx>({ lang: 'en', setLang: async () => {} })

/** Translate a string whose placeholders are React nodes: tx('Read the {link}.', { link: <a>…</a> }). */
export function tx(src: string, nodes: Record<string, ReactNode>): ReactNode {
  const text = t(src)
  const parts = text.split(/\{(\w+)\}/)
  return parts.map((p, i) => (i % 2 === 1 ? <Fragment key={i}>{p in nodes ? nodes[p] : `{${p}}`}</Fragment> : p))
}

export function I18nProvider({ children }: { children: ReactNode }) {
  // main.tsx loads the saved language before the first render.
  const [lang, setState] = useState<Lang>(currentLang)
  const setLang = useCallback(async (l: Lang) => {
    await loadLang(l)
    setCurrentLang(l)
    document.documentElement.lang = htmlLang(l)
    writePref(LANG_STORAGE_KEY, l)
    setState(l)
  }, [])
  const value = useMemo(() => ({ lang, setLang }), [lang, setLang])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

/**
 * Subscribe a component to the language. The app shell calls it, so every
 * page re-renders with the new language while keeping its state.
 */
export function useT() {
  const { lang, setLang } = useContext(I18nContext)
  return useMemo(() => ({ lang, setLang, t: (s: string, v?: Vars) => t(s, v), tn, tx }), [lang, setLang])
}
