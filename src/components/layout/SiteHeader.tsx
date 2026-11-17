import { AnimatePresence } from 'motion/react'
import { ChevronDown, Heart, Menu, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, TOOLS, useRouter } from '../../router'
import { LogoHorizontal } from '../brand/Logo'
import { useSupport } from '../support/Support'
import { DUR, EASE, motion, useReducedMotion } from '../ui/motion'
import { ToolDirectory } from './ToolDirectory'

/**
 * A plain bar: the logo, one "Tools" menu, About, and one action.
 * Desktop: the tools open as a panel under the bar. Phones: the same
 * directory fills the screen as a sheet.
 */
export function SiteHeader() {
  const { path } = useRouter()
  const reduce = useReducedMotion()
  const { openSupport } = useSupport()
  // The menu remembers the page it was opened on, so changing page closes it.
  const [openOn, setOpenOn] = useState<string | null>(null)
  const open = openOn === path
  const close = () => setOpenOn(null)
  const [scrolled, setScrolled] = useState(false)
  const deskPanel = useRef<HTMLDivElement>(null)
  const mobPanel = useRef<HTMLDivElement>(null)
  const desktopBtn = useRef<HTMLButtonElement>(null)
  const mobileBtn = useRef<HTMLButtonElement>(null)
  const inTools = TOOLS.some((t) => t.path === path)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Escape closes and returns focus; clicks outside close; the phone sheet locks page scroll.
  useEffect(() => {
    if (!open) return
    const wide = window.matchMedia('(min-width: 1024px)').matches
    const trigger = wide ? desktopBtn.current : mobileBtn.current
    const panel = wide ? deskPanel.current : mobPanel.current
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenOn(null)
        trigger?.focus()
      }
    }
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (panel?.contains(t) || desktopBtn.current?.contains(t) || mobileBtn.current?.contains(t)) return
      setOpenOn(null)
    }
    const prev = document.body.style.overflow
    if (!wide) document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onDown)
    const t = window.setTimeout(() => panel?.querySelector<HTMLElement>('a')?.focus({ preventScroll: true }), 60)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onDown)
      document.body.style.overflow = prev
      window.clearTimeout(t)
    }
  }, [open])

  return (
    <header className={`sticky top-0 z-40 transition-colors duration-300 ${scrolled || open ? 'bg-paper/[0.98]' : 'bg-ground'}`}>
      <nav aria-label="Main" className="wrap flex h-[var(--header-h)] items-center gap-2">
        <Link to="/" className="-ml-1.5 mr-auto flex shrink-0 items-center rounded-[10px] p-1.5 transition-opacity hover:opacity-80" aria-label="PinansyalPH home">
          <LogoHorizontal height={42} className="h-[38px] w-auto sm:h-[42px]" />
        </Link>

        {/* Desktop */}
        <div className="ui hidden items-center gap-1 lg:flex">
          <button
            ref={desktopBtn}
            type="button"
            aria-expanded={open}
            aria-controls="tools-menu"
            onClick={() => setOpenOn(open ? null : path)}
            className={`flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border-0 px-4 text-[0.9375rem] font-semibold transition-colors ${open || inTools ? 'bg-surface text-ink' : 'bg-transparent text-ink hover:bg-surface'}`}
          >
            Tools
            <ChevronDown aria-hidden="true" size={16} strokeWidth={2.2} className={`transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
          </button>
          <Link
            to="/about"
            aria-current={path === '/about' ? 'page' : undefined}
            className="flex min-h-11 items-center rounded-full px-4 text-[0.9375rem] font-semibold transition-colors hover:bg-surface aria-[current=page]:bg-surface"
          >
            About
          </Link>
          <button type="button" onClick={openSupport} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full border-0 bg-transparent px-4 text-[0.9375rem] font-semibold transition-colors hover:bg-surface">
            <Heart aria-hidden="true" size={16} strokeWidth={2.2} className="text-accent" />
            Support
          </button>
          <Link to="/sweldo" className="btn btn-primary btn-sm ml-2">
            Compute my sweldo
          </Link>
        </div>

        {/* Phones and tablets */}
        <Link to="/sweldo" className="btn btn-primary btn-sm hidden sm:inline-flex lg:hidden">
          Compute my sweldo
        </Link>
        <button
          ref={mobileBtn}
          type="button"
          className="ui flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-surface text-ink transition-colors hover:bg-surface-2 lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpenOn(open ? null : path)}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={open ? 'x' : 'menu'}
              initial={reduce ? false : { rotate: -60, opacity: 0, scale: 0.8 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={reduce ? undefined : { rotate: 60, opacity: 0, scale: 0.8 }}
              transition={{ duration: DUR.fast }}
              className="flex"
            >
              {open ? <X aria-hidden="true" size={22} /> : <Menu aria-hidden="true" size={22} />}
            </motion.span>
          </AnimatePresence>
          <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <>
            {/* Desktop panel */}
            <motion.div
              key="desktop"
              ref={deskPanel}
              id="tools-menu"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0, transition: { duration: DUR.base, ease: EASE } }}
              exit={{ opacity: 0, y: reduce ? 0 : -6, transition: { duration: 0.16 } }}
              className="absolute inset-x-0 top-full hidden lg:block"
            >
              <div className="wrap">
                <div className="ml-auto max-w-[920px] rounded-[28px] bg-paper p-5 shadow-[0_24px_60px_-20px_rgba(21,21,20,0.28),0_2px_6px_rgba(21,21,20,0.04)]">
                  <ToolDirectory onNavigate={close} />
                </div>
              </div>
            </motion.div>

            {/* Phone sheet */}
            <motion.div
              key="mobile"
              id="mobile-menu"
              ref={mobPanel}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0, transition: { duration: DUR.base, ease: EASE } }}
              exit={{ opacity: 0, transition: { duration: 0.16 } }}
              className="fixed inset-x-0 top-[var(--header-h)] bottom-0 overflow-y-auto overscroll-contain bg-paper lg:hidden"
            >
              <div className="wrap pt-4 pb-[max(32px,env(safe-area-inset-bottom))]">
                <ToolDirectory onNavigate={close} compact />
                <div className="ui mt-8 grid gap-1 rounded-[22px] bg-ground p-2">
                  <Link to="/" onClick={close} aria-current={path === '/' ? 'page' : undefined} className="flex min-h-[52px] items-center rounded-[16px] px-3 font-semibold hover:bg-surface aria-[current=page]:text-accent">
                    Home
                  </Link>
                  <Link to="/about" onClick={close} aria-current={path === '/about' ? 'page' : undefined} className="flex min-h-[52px] items-center rounded-[16px] px-3 font-semibold hover:bg-surface aria-[current=page]:text-accent">
                    About
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      close()
                      openSupport()
                    }}
                    className="flex min-h-[52px] cursor-pointer items-center gap-2 rounded-[16px] border-0 bg-transparent px-3 text-left text-base font-semibold hover:bg-surface"
                  >
                    <Heart aria-hidden="true" size={18} className="text-accent" /> Support PinansyalPH
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  )
}
