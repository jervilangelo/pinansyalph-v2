import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { Suspense, lazy, useEffect, useState, type ReactNode } from 'react'
import { BrandSpinner } from './components/brand/Logo'
import { Footer } from './components/layout/Footer'
import { SiteHeader } from './components/layout/SiteHeader'
import { SupportProvider } from './components/support/Support'
import { EASE, useReducedMotion } from './components/ui/motion'
import { useScenario } from './hooks/useScenario'
import { HomePage } from './pages/HomePage'
import { Router, useRouter, type Route } from './router'

// Tool pages load on demand, then prefetch while the browser is idle so moving between pages is instant.
const loadTools = () => import('./pages/ToolPages')
const loadAbout = () => import('./pages/AboutPage')
const SweldoPage = lazy(() => loadTools().then((m) => ({ default: m.SweldoPage })))
const loadUnderpaid = () => import('./pages/UnderpaidPage')
const UnderpaidPage = lazy(() => loadUnderpaid().then((m) => ({ default: m.UnderpaidPage })))
const ThirteenthPage = lazy(() => loadTools().then((m) => ({ default: m.ThirteenthPage })))
const Mp2Page = lazy(() => loadTools().then((m) => ({ default: m.Mp2Page })))
const BanksPage = lazy(() => loadTools().then((m) => ({ default: m.BanksPage })))
const ComparePage = lazy(() => loadTools().then((m) => ({ default: m.ComparePage })))
const InflationPage = lazy(() => loadTools().then((m) => ({ default: m.InflationPage })))
const GasPage = lazy(() => loadTools().then((m) => ({ default: m.GasPage })))
const AboutPage = lazy(() => loadAbout().then((m) => ({ default: m.AboutPage })))

function usePrefetch() {
  useEffect(() => {
    const run = () => void Promise.all([loadTools(), loadAbout(), loadUnderpaid()]).catch(() => {})
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
  const [show, setShow] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 200)
    return () => clearTimeout(t)
  }, [])
  return (
    <div aria-busy="true" className="flex min-h-[70svh] items-center justify-center">
      {show && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE }}>
          <BrandSpinner size={48} label="Loading page" />
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

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <Router>
        <SupportProvider>
          <a href="#main" className="skip-link">
            Skip to content
          </a>
          <SiteHeader />
          <Pages />
          <Footer />
        </SupportProvider>
      </Router>
    </MotionConfig>
  )
}
