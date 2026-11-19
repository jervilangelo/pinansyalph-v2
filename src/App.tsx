/*
 * PinansyalPH (https://pinansyalph.site/)
 * Copyright (c) 2026 Jervil Angelo De Leon. All rights reserved.
 *
 * This source code is proprietary to its author. Copying,
 * reproducing, modifying, distributing, publishing or reusing it, in whole or
 * in part, without the author's prior written permission is not allowed.
 * See the LICENSE file at the root of this repository.
 */

import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { Suspense, lazy, useEffect, useState, type ReactNode } from 'react'
import { BrandSpinner } from './components/brand/Logo'
import { Footer } from './components/layout/Footer'
import { ToolDock } from './components/layout/ToolDock'
import { SiteHeader } from './components/layout/SiteHeader'
import { SettingsProvider } from './components/settings/Settings'
import { SupportProvider } from './components/support/Support'
import { EASE, useReducedMotion } from './components/ui/motion'
import { useScenario } from './hooks/useScenario'
import { HomePage } from './pages/HomePage'
import { I18nProvider, useT } from './i18n/react'
import { Router, useRouter, type Route } from './router'
import { ThemeProvider } from './theme'

// Tool pages load on demand, then prefetch while the browser is idle so moving between pages is instant.
const loadTools = () => import('./pages/ToolPages')
const loadAbout = () => import('./pages/AboutPage')
const SweldoPage = lazy(() => loadTools().then((m) => ({ default: m.SweldoPage })))
const loadUnderpaid = () => import('./pages/UnderpaidPage')
const UnderpaidPage = lazy(() => loadUnderpaid().then((m) => ({ default: m.UnderpaidPage })))
const loadToll = () => import('./pages/TollPage')
const TollPage = lazy(() => loadToll().then((m) => ({ default: m.TollPage })))
const loadKuryente = () => import('./pages/KuryentePage')
const KuryentePage = lazy(() => loadKuryente().then((m) => ({ default: m.KuryentePage })))
const loadBahay = () => import('./pages/BahayPage')
const BahayPage = lazy(() => loadBahay().then((m) => ({ default: m.BahayPage })))
const loadSubs = () => import('./pages/SubscriptionPage')
const SubscriptionPage = lazy(() => loadSubs().then((m) => ({ default: m.SubscriptionPage })))
const loadKonsumo = () => import('./pages/KonsumoPage')
const KonsumoPage = lazy(() => loadKonsumo().then((m) => ({ default: m.KonsumoPage })))
const loadIwasan = () => import('./pages/IwasanPage')
const IwasanPage = lazy(() => loadIwasan().then((m) => ({ default: m.IwasanPage })))
const loadInternet = () => import('./pages/InternetPage')
const InternetPage = lazy(() => loadInternet().then((m) => ({ default: m.InternetPage })))
const ThirteenthPage = lazy(() => loadTools().then((m) => ({ default: m.ThirteenthPage })))
const Mp2Page = lazy(() => loadTools().then((m) => ({ default: m.Mp2Page })))
const BanksPage = lazy(() => loadTools().then((m) => ({ default: m.BanksPage })))
const ComparePage = lazy(() => loadTools().then((m) => ({ default: m.ComparePage })))
const InflationPage = lazy(() => loadTools().then((m) => ({ default: m.InflationPage })))
const GasPage = lazy(() => loadTools().then((m) => ({ default: m.GasPage })))
const AboutPage = lazy(() => loadAbout().then((m) => ({ default: m.AboutPage })))

function usePrefetch() {
  useEffect(() => {
    const run = () => void Promise.all([loadTools(), loadAbout(), loadUnderpaid(), loadToll(), loadKuryente(), loadBahay(), loadSubs(), loadKonsumo(), loadInternet(), loadIwasan()]).catch(() => {})
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }
    if (w.requestIdleCallback) w.requestIdleCallback(run, { timeout: 3000 })
    else setTimeout(run, 1500)
  }, [])
}

/**
 * Shown only if a page's code is still loading. Waits 200ms before
 * appearing so fast loads never flash a loader.
 */
function PageFallback() {
  const { t } = useT()
  const [show, setShow] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 200)
    return () => clearTimeout(t)
  }, [])
  return (
    <div aria-busy="true" className="flex min-h-[70svh] items-center justify-center">
      {show && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE }}>
          <BrandSpinner size={48} label={t('Loading page')} />
        </motion.div>
      )}
    </div>
  )
}

function Pages() {
  // One shared scenario lives above the pages, so amounts carry over between MP2, banks and the comparison.
  const s = useScenario()
  const { path } = useRouter()
  const reduce = useReducedMotion()
  usePrefetch()

  const pages: Record<Route, ReactNode> = {
    '/': <HomePage />,
    '/sweldo': <SweldoPage s={s} />,
    '/underpaid-ba-ko': <UnderpaidPage />,
    '/13th-month': <ThirteenthPage s={s} />,
    '/mp2': <Mp2Page s={s} />,
    '/banks': <BanksPage s={s} />,
    '/compare': <ComparePage s={s} />,
    '/inflation': <InflationPage />,
    '/gas': <GasPage />,
    '/magkano-ang-toll': <TollPage />,
    '/magkano-kuryente': <KuryentePage />,
    '/magkano-bahay': <BahayPage />,
    '/magkano-subscription': <SubscriptionPage />,
    '/magkano-konsumo': <KonsumoPage />,
    '/sulit-internet': <InternetPage />,
    '/mga-dapat-iwasan': <IwasanPage />,
    '/about': <AboutPage />,
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.main
        id="main"
        key={path}
        tabIndex={-1}
        className="outline-none"
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.38, ease: EASE } }}
        exit={reduce ? { opacity: 0, transition: { duration: 0.1 } } : { opacity: 0, y: -6, transition: { duration: 0.16, ease: 'easeIn' } }}
      >
        <Suspense fallback={<PageFallback />}>{pages[path]}</Suspense>
      </motion.main>
    </AnimatePresence>
  )
}

/**
 * Everything under the providers. It subscribes to the language, so a language
 * change re-renders the whole site in place: calculator inputs and results stay.
 */
function Shell() {
  const { t } = useT()
  return (
    <Router>
      <SettingsProvider>
        <SupportProvider>
          <a href="#main" className="skip-link">
            {t('Skip to content')}
          </a>
          <SiteHeader />
          <Pages />
          <Footer />
          {/* Room for the floating dock at the end of every page. */}
          <div aria-hidden="true" className="h-24 lg:h-24" />
          <ToolDock />
        </SupportProvider>
      </SettingsProvider>
    </Router>
  )
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <ThemeProvider>
        <I18nProvider>
          <Shell />
        </I18nProvider>
      </ThemeProvider>
    </MotionConfig>
  )
}
