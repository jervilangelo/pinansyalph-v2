import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { DEFAULT_LANG, LANG_STORAGE_KEY, htmlLang, isLang, loadLang, setCurrentLang, type Lang } from './i18n'
import { readPref } from './prefs'

async function boot() {
  // Load the saved language (Filipino by default) before the first render, so text never switches after paint.
  const saved = readPref(LANG_STORAGE_KEY)
  let lang: Lang = isLang(saved) ? saved : DEFAULT_LANG
  try {
    await loadLang(lang)
  } catch {
    lang = 'en' // a failed catalog download falls back to the built-in English
  }
  setCurrentLang(lang)
  document.documentElement.lang = htmlLang(lang)

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void boot()
