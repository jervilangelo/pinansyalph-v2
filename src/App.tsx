import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { Suspense, lazy, useEffect, type ReactNode } from 'react'
import { SiteHeader } from './components/layout/SiteHeader'
import { Footer } from './components/sections/Footer'
import { EASE, useReducedMotion } from './components/ui/motion'
import { useScenario } from './hooks/useScenario'
import { HomePage } from './pages/HomePage'
import { Router, useRouter, type Route } from './router'

// Tool pages load on demand, then prefetch while the browser is idle so moving between pages is instant.
const loadTools = () => import('./pages/ToolPages')
const loadAbout = () => import('./pages/AboutPage')
const SweldoPage = lazy(() => loadTools().then((m) => ({ default: m.SweldoPage })))
const ThirteenthPage = lazy(() => loadTools().then((m) => ({ default: m.ThirteenthPage })))
const Mp2Page = lazy(() => loadTools().then((m) => ({ default: m.Mp2Page })))
const BanksPage = lazy(() => loadTools().then((m) => ({ default: m.BanksPage })))
const ComparePage = lazy(() => loadTools().then((m) => ({ default: m.ComparePage })))
const InflationPage = lazy(() => loadTools().then((m) => ({ default: m.InflationPage })))
const GasPage = lazy(() => loadTools().then((m) => ({ default: m.GasPage })))
const AboutPage = lazy(() => loadAbout().then((m) => ({ default: m.AboutPage })))

function usePrefetch() {
  useEffect(() => {
    const run = () => void Promise.all([loadTools(), loadAbout()]).catch(() => {})
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }
    if (w.requestIdleCallback) w.requestIdleCallback(run, { timeout: 3000 })
    else setTimeout(run, 1500)
  }, [])
}

function PageFallback() {
  return <div aria-busy="true" className="min-h-[100svh]" />
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
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } }}
        exit={reduce ? { opacity: 0, transition: { duration: 0.1 } } : { opacity: 0, y: -8, transition: { duration: 0.2, ease: 'easeIn' } }}
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
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <SiteHeader />
        <Pages />
        <Footer />
      </Router>
    </MotionConfig>
  )
}
