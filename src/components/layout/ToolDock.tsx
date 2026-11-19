/*
 * PinansyalPH (https://pinansyalph.site/)
 * Copyright (c) 2026 Jervil Angelo De Leon. All rights reserved.
 *
 * This source code is proprietary to its author. Copying,
 * reproducing, modifying, distributing, publishing or reusing it, in whole or
 * in part, without the author's prior written permission is not allowed.
 * See the LICENSE file at the root of this repository.
 */

import { AnimatePresence } from 'motion/react'
import { LayoutGrid, ShieldAlert, X } from 'lucide-react'
import { Fragment, useEffect, useRef, useState } from 'react'
import { GROUPS, Link, TOOLS, useRouter } from '../../router'
import { SymbolSmall } from '../brand/Logo'
import { ToolMark } from '../brand/ToolMark'
import { DUR, EASE, SPRING, motion, useReducedMotion } from '../ui/motion'
import { tx } from '../../i18n/react'
import { t, tv } from '../../i18n'

/**
 * Every tool, always one tap away. Built from TOOLS, so a tool registered in
 * the router appears here by itself.
 *
 * Desktop: a dock floating at the bottom of the screen, grouped by Sahod,
 * Ipon, Presyo and Gastos. It steps aside while you scroll down to read and
 * returns when you scroll up or reach the end. Phones: a launcher button that
 * opens a sheet of all tools.
 */

function useScrollAway() {
  const [hidden, setHidden] = useState(false)
  useEffect(() => {
    let last = window.scrollY
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const y = window.scrollY
        const atEnd = window.innerHeight + y >= document.documentElement.scrollHeight - 80
        if (y < 120 || atEnd) setHidden(false)
        else if (y > last + 6) setHidden(true)
        else if (y < last - 6) setHidden(false)
        last = y
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [])
  return hidden
}

export function ToolDock() {
  const hidden = useScrollAway()
  return (
    <>
      <DesktopDock hidden={hidden} />
      <MobileLauncher hidden={hidden} />
    </>
  )
}

function DesktopDock({ hidden }: { hidden: boolean }) {
  const { path } = useRouter()
  const reduce = useReducedMotion()
  const [focus, setFocus] = useState<string | null>(null)
  return (
    <motion.nav
      aria-label={t("All tools")}
      className="tool-dock pointer-events-none fixed inset-x-0 bottom-4 z-30 hidden justify-center lg:flex"
      initial={false}
      animate={hidden && !focus ? { y: 96, opacity: 0 } : { y: 0, opacity: 1 }}
      transition={reduce ? { duration: 0 } : { duration: DUR.base, ease: EASE }}
      data-testid="tool-dock"
    >
      <ul className="pointer-events-auto m-0 flex list-none items-center gap-0.5 rounded-[22px] bg-paper p-1.5 shadow-[0_18px_44px_-16px_rgba(21,21,20,0.35),0_1px_3px_rgba(21,21,20,0.08)]">
        <li>
          <DockItem to="/" label={t("Home")} hint={t("All of PinansyalPH")} active={path === '/'} focus={focus} setFocus={setFocus}>
            <SymbolSmall size={26} />
          </DockItem>
        </li>
        {GROUPS.map((g) => (
          <Fragment key={g.id}>
            <li aria-hidden="true" className="mx-1 h-6 w-[3px] rounded-full bg-surface" />
            {TOOLS.filter((t) => t.group === g.id).map((t) => (
              <li key={t.path}>
                <DockItem to={t.path} label={tv(t.name)} hint={tv(t.hint) ?? tv(t.blurb)} active={path === t.path} focus={focus} setFocus={setFocus}>
                  <ToolMark path={t.path} size={28} />
                </DockItem>
              </li>
            ))}
          </Fragment>
        ))}
        <li aria-hidden="true" className="mx-1 h-6 w-[3px] rounded-full bg-surface" />
        <li>
          <DockItem to="/mga-dapat-iwasan" label={t("Mga Dapat Iwasan")} hint={t("Financial traps to avoid")} active={path === '/mga-dapat-iwasan'} focus={focus} setFocus={setFocus}>
            <span className="flex h-7 w-7 items-center justify-center rounded-[9px] bg-alarm text-white">
              <ShieldAlert size={17} strokeWidth={2.3} />
            </span>
          </DockItem>
        </li>
      </ul>
    </motion.nav>
  )
}

function DockItem({
  to,
  label,
  hint,
  active,
  focus,
  setFocus,
  children,
}: {
  to: string
  label: string
  hint: string
  active: boolean
  focus: string | null
  setFocus: (s: string | null) => void
  children: React.ReactNode
}) {
  const reduce = useReducedMotion()
  const open = focus === to
  return (
    <div className="relative">
      <Link
        to={to}
        aria-current={active ? 'page' : undefined}
        onMouseEnter={() => setFocus(to)}
        onMouseLeave={() => setFocus(null)}
        onFocus={() => setFocus(to)}
        onBlur={() => setFocus(null)}
        className="dock-item group relative flex h-11 w-11 items-center justify-center rounded-[14px]"
      >
        <span className="sr-only">{tv(label)}</span>
        {active && <motion.span layoutId="dock-active" aria-hidden="true" className="absolute inset-0 rounded-[14px] bg-accent-soft" transition={reduce ? { duration: 0 } : SPRING} />}
        <span className="relative transition-transform duration-300 ease-[var(--ease-out-quint)] group-hover:-translate-y-1 group-hover:scale-110 group-focus-visible:-translate-y-1">{children}</span>
        {active && <motion.span layoutId="dock-dot" aria-hidden="true" className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-accent" transition={reduce ? { duration: 0 } : SPRING} />}
      </Link>
      <AnimatePresence>
        {open && (
          <motion.span
            role="tooltip"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0, transition: { duration: DUR.fast, ease: EASE } }}
            exit={{ opacity: 0, transition: { duration: 0.08 } }}
            className="ui pointer-events-none absolute bottom-[calc(100%+12px)] left-1/2 w-max max-w-[240px] -translate-x-1/2 rounded-[12px] bg-ink px-3 py-2 text-center text-ground"
          >
            <span className="block text-[0.875rem] font-semibold">{tv(label)}</span>
            <span className="block text-[0.75rem] text-ground/75">{tv(hint)}</span>
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  )
}

function MobileLauncher({ hidden }: { hidden: boolean }) {
  const { path } = useRouter()
  const reduce = useReducedMotion()
  const [open, setOpen] = useState(false)
  const btn = useRef<HTMLButtonElement>(null)
  const sheet = useRef<HTMLDivElement>(null)
  const current = TOOLS.find((t) => t.path === path)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        btn.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    requestAnimationFrame(() => sheet.current?.querySelector<HTMLElement>('a[aria-current="page"], a')?.focus())
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open])

  return (
    <div className="lg:hidden">
      <motion.button
        ref={btn}
        type="button"
        aria-expanded={open}
        aria-controls="tool-sheet"
        onClick={() => setOpen(true)}
        initial={false}
        animate={hidden && !open ? { y: 96, opacity: 0 } : { y: 0, opacity: 1 }}
        transition={reduce ? { duration: 0 } : { duration: DUR.base, ease: EASE }}
        className="tool-launcher ui fixed right-4 bottom-[max(16px,env(safe-area-inset-bottom))] z-30 flex h-14 cursor-pointer items-center gap-2 rounded-[18px] border-0 bg-paper py-2 pr-4 pl-2 text-[0.9375rem] font-semibold text-ink shadow-[0_14px_36px_-12px_rgba(21,21,20,0.4),0_1px_3px_rgba(21,21,20,0.08)]"
        data-testid="tool-launcher"
      >{tx("{span}All tools", { span: (<span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-ground">
          {current ? <ToolMark path={current.path} size={28} /> : <LayoutGrid size={20} className="text-accent" />}
        </span>), })}</motion.button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              aria-hidden="true"
              className="fixed inset-0 z-40 bg-ink/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: DUR.fast }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              ref={sheet}
              id="tool-sheet"
              role="dialog"
              aria-modal="true"
              aria-label={t("All tools")}
              className="fixed inset-x-0 bottom-0 z-50 max-h-[85svh] overflow-y-auto overscroll-contain rounded-t-[28px] bg-paper px-4 pt-4 pb-[max(20px,env(safe-area-inset-bottom))]"
              initial={reduce ? { opacity: 0 } : { y: '100%' }}
              animate={reduce ? { opacity: 1 } : { y: 0 }}
              exit={reduce ? { opacity: 0 } : { y: '100%' }}
              transition={reduce ? { duration: DUR.fast } : { duration: 0.42, ease: EASE }}
              data-testid="tool-sheet"
            >
              <div className="flex items-center justify-between gap-3 px-1">
                <p className="serif text-[1.5rem] leading-tight">{t("Lahat ng tools")}</p>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    btn.current?.focus()
                  }}
                  className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-0 bg-surface text-ink"
                >
                  <X aria-hidden="true" size={20} />
                  <span className="sr-only">{t("Close")}</span>
                </button>
              </div>
              <Link to="/mga-dapat-iwasan" onClick={() => setOpen(false)} className="ui mt-4 flex items-center gap-3 rounded-[16px] bg-alarm-soft p-3 font-semibold text-alarm-deep">{tx("{span}Mga Dapat Iwasan{span2}", { span: (<span className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-alarm text-white">
                  <ShieldAlert aria-hidden="true" size={18} />
                </span>), span2: (<span className="ml-auto rounded-full bg-alarm px-2 py-0.5 text-[0.6875rem] font-bold text-white">{t("BASAHIN")}</span>), })}</Link>
              {GROUPS.map((g, gi) => (
                <section key={g.id} aria-labelledby={`sheet-${g.id}`} className="mt-5">
                  <h2 id={`sheet-${g.id}`} className="ui px-1 text-[0.9375rem] font-semibold text-accent">
                    {tv(g.label)} <span className="font-medium text-muted">· {tv(g.gloss)}</span>
                  </h2>
                  <ul className="m-0 mt-2 grid list-none grid-cols-3 gap-1.5 p-0 min-[480px]:grid-cols-4">
                    {TOOLS.filter((t) => t.group === g.id).map((t, i) => (
                      <motion.li
                        key={t.path}
                        initial={reduce ? false : { opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: reduce ? 0 : 0.04 * (gi * 3 + i), duration: DUR.base, ease: EASE }}
                      >
                        <Link
                          to={t.path}
                          aria-current={path === t.path ? 'page' : undefined}
                          onClick={() => setOpen(false)}
                          className="ui flex h-full flex-col items-center gap-1.5 rounded-[16px] px-1 py-3 text-center text-[0.8125rem] leading-tight font-semibold text-ink-2 hover:bg-ground aria-[current=page]:bg-accent-soft aria-[current=page]:text-accent"
                        >
                          <ToolMark path={t.path} size={34} />
                          {tv(t.label)}
                        </Link>
                      </motion.li>
                    ))}
                  </ul>
                </section>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
