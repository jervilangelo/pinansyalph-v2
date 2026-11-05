import { AnimatePresence, motion, useScroll, useSpring } from 'motion/react'
import { ArrowRight, Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, PAGES, useRouter } from '../../router'
import { EASE, useReducedMotion } from '../ui/motion'

export const NAV = PAGES

function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 })
  return <motion.div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] origin-left bg-accent" style={{ scaleX }} />
}

export function SiteHeader() {
  const { path } = useRouter()
  const reduce = useReducedMotion()
  // The menu remembers which page it was opened on, so changing page closes it.
  const [openOn, setOpenOn] = useState<string | null>(null)
  const open = openOn === path
  const setOpen = (v: boolean | ((o: boolean) => boolean)) => setOpenOn((typeof v === 'function' ? v(open) : v) ? path : null)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Escape closes the menu.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpenOn(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div
      className={`sticky top-0 z-40 bg-ground/90 px-[var(--gutter)] pt-2 pb-2 backdrop-blur-md transition-shadow duration-300 supports-[not(backdrop-filter:blur(1px))]:bg-ground ${
        scrolled ? 'shadow-[0_1px_0_rgba(21,21,20,0.08),0_8px_24px_-16px_rgba(21,21,20,0.25)]' : ''
      }`}
    >
      <nav aria-label="Main" className="flex h-[56px] gap-2 sm:h-[60px]">
        <Link
          to="/"
          className="ui group flex aspect-square h-full items-center justify-center bg-ink text-[1.05rem] font-semibold text-ground transition-transform duration-300 ease-[var(--ease-out-quint)] hover:scale-[0.94]"
          aria-label="PinansyalPH home"
        >
          <span className="transition-transform duration-500 ease-[var(--ease-out-quint)] group-hover:rotate-[-8deg]">₱</span>
        </Link>

        {/* Desktop */}
        <div className="ui hidden min-w-0 flex-1 items-center bg-surface lg:flex">
          <Link to="/" className="hidden shrink-0 pr-4 pl-5 text-[0.9375rem] font-semibold xl:block">
            PinansyalPH
          </Link>
          <ul className="m-0 flex min-w-0 list-none gap-0.5 p-0 pl-2 xl:pl-0">
            {NAV.map((n) => {
              const active = path === n.path
              return (
                <li key={n.path} className="relative">
                  <Link
                    to={n.path}
                    aria-current={active ? 'page' : undefined}
                    className="relative z-10 block px-3 py-2 text-[0.9375rem] font-medium whitespace-nowrap transition-colors duration-200 hover:text-accent aria-[current=page]:text-ground aria-[current=page]:hover:text-ground"
                  >
                    {n.label}
                  </Link>
                  {active && (
                    <motion.span
                      layoutId="nav-pill"
                      aria-hidden="true"
                      className="absolute inset-0 bg-ink"
                      transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 36 }}
                    />
                  )}
                </li>
              )
            })}
          </ul>
        </div>

        {/* Mobile and tablet */}
        <div className="flex min-w-0 flex-1 items-center bg-surface lg:hidden">
          <Link to="/" className="ui truncate pl-4 text-[0.9375rem] font-semibold">
            PinansyalPH
          </Link>
          {path !== '/' && (
            <span className="ui truncate pl-2 text-[0.9375rem] text-muted">/ {NAV.find((n) => n.path === path)?.label}</span>
          )}
        </div>
        <button
          type="button"
          className="ui flex aspect-square h-full items-center justify-center bg-surface transition-colors hover:bg-surface-2 lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((v) => !v)}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={open ? 'x' : 'menu'}
              initial={reduce ? false : { rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={reduce ? undefined : { rotate: 90, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="flex"
            >
              {open ? <X aria-hidden="true" size={22} /> : <Menu aria-hidden="true" size={22} />}
            </motion.span>
          </AnimatePresence>
          <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
        </button>
        <Link to="/mp2" className="btn btn-ink group hidden h-full shrink-0 xl:inline-flex">
          Calculate my savings
          <ArrowRight aria-hidden="true" size={18} className="transition-transform duration-300 ease-[var(--ease-out-quint)] group-hover:translate-x-1" />
        </Link>
      </nav>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="menu"
            initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reduce ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="overflow-hidden lg:hidden"
          >
            <ul id="mobile-menu" className="ui m-0 grid list-none grid-cols-2 gap-2 p-0 pt-2 sm:grid-cols-4">
              {NAV.map((n, i) => (
                <motion.li
                  key={n.path}
                  initial={reduce ? false : { opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.04 * i, ease: EASE }}
                >
                  <Link
                    to={n.path}
                    aria-current={path === n.path ? 'page' : undefined}
                    className="flex min-h-[48px] items-center bg-surface px-4 py-3 font-medium transition-colors hover:bg-surface-2 aria-[current=page]:bg-ink aria-[current=page]:text-ground"
                  >
                    {n.label}
                  </Link>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
      <ScrollProgress />
    </div>
  )
}
