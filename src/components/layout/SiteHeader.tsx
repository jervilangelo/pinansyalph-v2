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
import { ChevronDown, Heart, Menu, Settings as SettingsIcon, ShieldAlert, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, TOOLS, useRouter } from '../../router'
import { LogoHorizontal } from '../brand/Logo'
import { useSettings } from '../settings/Settings'
import { useSupport } from '../support/Support'
import { DUR, EASE, motion, useReducedMotion } from '../ui/motion'
import { ShareButton } from './ShareButton'
import { ToolDirectory } from './ToolDirectory'
import { tx } from '../../i18n/react'
import { t } from '../../i18n'

/**
 * A plain bar: the logo, one "Tools" menu, About, Support and, last on the
 * right, a Share button for the current page.
 * Desktop: the tools open as a panel under the bar. Phones: the same
 * directory fills the screen as a sheet.
 */
export function SiteHeader() {
  const { path } = useRouter()
  const reduce = useReducedMotion()
  const { openSupport } = useSupport()
  const { openSettings } = useSettings()
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
      <nav aria-label={t("Main")} className="wrap flex h-[var(--header-h)] items-center gap-2">
        <Link to="/" className="-ml-1.5 mr-auto flex shrink-0 items-center rounded-[10px] p-1.5 transition-opacity hover:opacity-80" aria-label={t("PinansyalPH home")}>
          <LogoHorizontal height={42} className="h-[30px] w-auto min-[380px]:h-[38px] sm:h-[42px]" />
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
          >{t("Tools")}<ChevronDown aria-hidden="true" size={16} strokeWidth={2.2} className={`transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
          </button>
          <Link
            to="/about"
            aria-current={path === '/about' ? 'page' : undefined}
            className="flex min-h-11 items-center rounded-full px-4 text-[0.9375rem] font-semibold transition-colors hover:bg-surface aria-[current=page]:bg-surface"
          >{t("About")}</Link>
          <button
            type="button"
            onClick={openSupport}
            className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full border-0 bg-transparent px-4 text-[0.9375rem] font-semibold transition-colors hover:bg-surface"
          >
            <Heart aria-hidden="true" size={16} strokeWidth={2.2} className="text-accent" />{t("Support")}</button>
          <span aria-hidden="true" className="mx-2 h-6 w-[2px] rounded-full bg-surface-2" />
          <ShareButton />
          <button
            type="button"
            onClick={openSettings}
            aria-label={t("Settings")}
            title={t("Settings")}
            data-testid="settings-button"
            className="group ml-1 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-ink transition-colors hover:bg-surface"
          >
            <SettingsIcon aria-hidden="true" size={20} strokeWidth={2.1} className="transition-transform duration-500 ease-[var(--ease-out-quint)] group-hover:rotate-45" />
          </button>
        </div>

        {/* Phones and tablets */}
        <ShareButton compact />
        <button
          type="button"
          onClick={openSettings}
          aria-label={t("Settings")}
          data-testid="settings-button-mobile"
          className="ui flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-ink transition-colors hover:bg-surface lg:hidden"
        >
          <SettingsIcon aria-hidden="true" size={21} strokeWidth={2.1} />
        </button>
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
          <span className="sr-only">{open ? t("Close menu") : t("Open menu")}</span>
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
                <div className="ml-auto max-w-[1180px] rounded-[28px] bg-paper p-5 shadow-[0_24px_60px_-20px_rgba(21,21,20,0.28),0_2px_6px_rgba(21,21,20,0.04)]">
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
                <Link
                  to="/mga-dapat-iwasan"
                  onClick={close}
                  aria-current={path === '/mga-dapat-iwasan' ? 'page' : undefined}
                  className="ui mb-6 flex items-center gap-3 rounded-[18px] bg-alarm-soft p-3 text-alarm-deep outline-offset-2 hover:bg-alarm-muted"
                  data-testid="iwasan-mobile-link"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-alarm text-white">
                    <ShieldAlert aria-hidden="true" size={22} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-[1rem] font-semibold">{tx("Mga Dapat Iwasan{span}", { span: (<span className="rounded-full bg-alarm px-2 py-0.5 text-[0.6875rem] font-bold tracking-[0.04em] text-white">{t("BASAHIN")}</span>), })}</span>
                    <span className="mt-0.5 block text-[0.8125rem] text-alarm-deep/80">{t("Gambling, loan apps, credit cards and installment traps")}</span>
                  </span>
                </Link>
                <ToolDirectory onNavigate={close} compact />
                <div className="ui mt-8 grid gap-1 rounded-[22px] bg-ground p-2">
                  <Link
                    to="/"
                    onClick={close}
                    aria-current={path === '/' ? 'page' : undefined}
                    className="flex min-h-[52px] items-center rounded-[16px] px-3 font-semibold hover:bg-surface aria-[current=page]:text-accent"
                  >{t("Home")}</Link>
                  <Link
                    to="/about"
                    onClick={close}
                    aria-current={path === '/about' ? 'page' : undefined}
                    className="flex min-h-[52px] items-center rounded-[16px] px-3 font-semibold hover:bg-surface aria-[current=page]:text-accent"
                  >{t("About")}</Link>
                  <button
                    type="button"
                    onClick={() => {
                      close()
                      openSupport()
                    }}
                    className="flex min-h-[52px] cursor-pointer items-center gap-2 rounded-[16px] border-0 bg-transparent px-3 text-left text-base font-semibold hover:bg-surface"
                  >
                    <Heart aria-hidden="true" size={18} className="text-accent" />{' '}{t("Support PinansyalPH")}</button>
                  <button
                    type="button"
                    onClick={() => {
                      close()
                      openSettings()
                    }}
                    className="flex min-h-[52px] cursor-pointer items-center gap-2 rounded-[16px] border-0 bg-transparent px-3 text-left text-base font-semibold hover:bg-surface"
                  >
                    <SettingsIcon aria-hidden="true" size={18} className="text-accent" />{' '}{t("Settings")}</button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  )
}
