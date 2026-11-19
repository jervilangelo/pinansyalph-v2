import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { readPref, writePref } from './prefs'

/**
 * Light (default) and dark appearance. The colours are CSS custom properties
 * in src/index.css, switched by `data-theme` on <html>. A small inline script
 * in index.html applies the saved theme before the first paint, so a dark
 * visit never flashes light.
 */
export type Theme = 'light' | 'dark'
export const THEME_STORAGE_KEY = 'pinansyalph-theme'
export const DEFAULT_THEME: Theme = 'light'
const isTheme = (v: unknown): v is Theme => v === 'light' || v === 'dark'

/** Browser chrome colour per theme (matches --color-ground). */
const THEME_COLOR: Record<Theme, string> = { light: '#f6f4ef', dark: '#18191b' }

export function savedTheme(): Theme {
  const v = readPref(THEME_STORAGE_KEY)
  return isTheme(v) ? v : DEFAULT_THEME
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.dataset.theme = theme
  root.style.colorScheme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme])
}

type Ctx = { theme: Theme; setTheme: (t: Theme) => void }
const ThemeContext = createContext<Ctx>({ theme: DEFAULT_THEME, setTheme: () => {} })

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setState] = useState<Theme>(() => {
    const t = savedTheme()
    applyTheme(t)
    return t
  })
  const setTheme = useCallback((t: Theme) => {
    applyTheme(t)
    writePref(THEME_STORAGE_KEY, t)
    setState(t)
  }, [])
  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)
