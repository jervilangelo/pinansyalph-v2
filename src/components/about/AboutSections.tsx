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
import { ArrowUpRight, BriefcaseBusiness, FolderGit2, Globe, Mail, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { GROUPS, Link, TOOLS } from '../../router'
import { EMAIL, GITHUB_PROFILE, LINKEDIN, PORTFOLIO } from '../../site'
import { ToolMark } from '../brand/ToolMark'
import { DUR, EASE, Reveal, motion, useReducedMotion } from '../ui/motion'
import { t, tv } from '../../i18n'

/** What PinansyalPH is: the whole toolkit at a glance. */
export function ToolkitSection() {
  return (
    <section aria-labelledby="toolkit-title" className="wrap mt-[clamp(80px,9vw,140px)]">
      <div className="grid gap-10 lg:grid-cols-12">
        <Reveal className="lg:col-span-6">
          <h2 id="toolkit-title" className="text-step-head max-w-[16ch]">{t("An all-in-one Filipino financial toolkit")}</h2>
          <div className="mt-6 grid gap-4 text-[1.125rem] leading-[1.65]">
            <p>{t("PinansyalPH is a free collection of practical financial tools built for Filipinos. It helps you understand your salary, savings, everyday expenses and financial decisions.")}</p>
            <p>{t("From understanding your salary and savings to comparing internet plans, estimating electricity costs and tracking everyday expenses, it brings useful calculators and financial information into one free, easy-to-use place. No signup, no login and no ads.")}</p>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#tools-list" className="btn btn-primary group">{t("Explore the tools")}<ArrowUpRight aria-hidden="true" size={18} className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
            <a href={`mailto:${EMAIL}`} className="btn btn-soft">{t("Report an issue")}</a>
          </div>
        </Reveal>
        <Reveal delay={0.08} className="lg:col-span-6">
          <div id="tools-list" className="grid scroll-mt-24 gap-6 rounded-[32px] bg-paper p-6 sm:p-8">
            {GROUPS.map((g) => (
              <div key={g.id}>
                <p className="ui text-[0.9375rem] font-semibold text-accent">
                  {tv(g.label)} <span className="font-medium text-muted">· {tv(g.question)}</span>
                </p>
                <ul className="m-0 mt-3 flex list-none flex-wrap gap-2 p-0">
                  {TOOLS.filter((t) => t.group === g.id).map((t) => (
                    <li key={t.path}>
                      <Link to={t.path} className="ui flex items-center gap-2 rounded-full bg-ground py-1.5 pr-4 pl-1.5 text-[0.9375rem] font-medium transition-colors hover:bg-accent-soft">
                        <ToolMark path={t.path} size={28} />
                        {tv(t.label)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}

const CONTACTS = [
  { href: `mailto:${EMAIL}`, label: 'Email', value: EMAIL, icon: Mail },
  { href: LINKEDIN, label: 'LinkedIn', value: 'linkedin.com/in/jervilangelo', icon: BriefcaseBusiness },
  { href: GITHUB_PROFILE, label: 'GitHub', value: 'github.com/jervilangelo', icon: FolderGit2 },
  { href: PORTFOLIO, label: 'Portfolio', value: 'jervilangelo.online', icon: Globe },
]

/** "Connect with me": a button that opens a small panel of contact links. */
export function ConnectSection() {
  const [open, setOpen] = useState(false)
  const reduce = useReducedMotion()
  const btn = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        btn.current?.focus()
      }
    }
    const onDown = (e: PointerEvent) => {
      if (!panel.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onDown)
    requestAnimationFrame(() => panel.current?.querySelector('a')?.focus())
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onDown)
    }
  }, [open])

  return (
    <section aria-labelledby="connect-title" className="wrap mt-[clamp(80px,9vw,140px)]">
      <Reveal className="grid gap-8 rounded-[32px] bg-night p-6 text-night-ink sm:p-10 lg:grid-cols-12 lg:items-end lg:p-14">
        <div className="lg:col-span-7">
          <h2 id="connect-title" className="text-step-head">{t("Contact and connect")}</h2>
          <p className="mt-4 max-w-[48ch] text-[1.0625rem] leading-relaxed text-night-ink/80">{t("Questions, a correction, an idea for a tool, or work you would like to talk about: I read every message.")}</p>
        </div>
        <div className="relative lg:col-span-5 lg:justify-self-end">
          <button ref={btn} type="button" aria-expanded={open} aria-controls="connect-panel" onClick={() => setOpen((o) => !o)} className="btn btn-paper">{t("Connect with me")}</button>
          <AnimatePresence>
            {open && (
              <motion.div
                ref={panel}
                id="connect-panel"
                role="dialog"
                aria-label={t("Contact links")}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: DUR.base, ease: EASE } }}
                exit={{ opacity: 0, transition: { duration: 0.12 } }}
                className="absolute bottom-[calc(100%+12px)] left-0 z-20 w-[min(340px,calc(100vw-64px))] origin-bottom-left rounded-[22px] bg-paper p-2 text-ink shadow-[0_24px_60px_-20px_rgba(0,0,0,0.5)] lg:right-0 lg:left-auto lg:origin-bottom-right"
                data-testid="connect-panel"
              >
                <div className="flex items-center justify-between px-3 pt-2 pb-1">
                  <p className="ui text-[0.875rem] font-semibold text-muted">{t("Jervil Angelo De Leon")}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false)
                      btn.current?.focus()
                    }}
                    className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-muted hover:bg-surface"
                  >
                    <X aria-hidden="true" size={16} />
                    <span className="sr-only">{t("Close")}</span>
                  </button>
                </div>
                <ul className="m-0 grid list-none gap-0.5 p-0">
                  {CONTACTS.map((c) => (
                    <li key={c.label}>
                      <a
                        href={c.href}
                        {...(c.href.startsWith('mailto:') ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
                        className="ui group flex items-center gap-3 rounded-[14px] px-3 py-2.5 hover:bg-ground"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-accent-soft text-accent">
                          <c.icon aria-hidden="true" size={18} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[0.9375rem] font-semibold">{tv(c.label)}</span>
                          <span className="block truncate text-[0.8125rem] text-muted">{c.value}</span>
                        </span>
                        <ArrowUpRight aria-hidden="true" size={16} className="text-muted transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </a>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Reveal>
    </section>
  )
}

const STORED: { tool: string; what: string }[] = [
  { tool: 'Sweldo calculator', what: 'your inputs, only if you turn on remembering them' },
  { tool: 'Magkano ang Toll Ko?', what: 'routes you save' },
  { tool: 'Magkano ba Subscription Ko?', what: 'your subscription list and budget' },
  { tool: 'Magkano Konsumo Ko?', what: 'your appliance list and electricity rate' },
  { tool: 'Sulit Ba Internet Ko?', what: 'your plan details and saved comparisons' },
]

/** Privacy and data accuracy, written from what the code actually does. */
export function PrivacySection() {
  return (
    <section aria-labelledby="privacy-title" className="wrap mt-[clamp(80px,9vw,140px)]">
      <div className="grid gap-10 lg:grid-cols-12">
        <Reveal className="lg:col-span-5">
          <h2 id="privacy-title" className="text-step-head">{t("Your data stays yours")}</h2>
          <p className="mt-5 text-[1.125rem] leading-[1.65]">{t("PinansyalPH has no accounts, no ads, no analytics and no server of its own. Every calculation runs in your browser, and nothing you type is sent to us or anyone else.")}</p>
        </Reveal>
        <Reveal delay={0.06} className="grid gap-4 lg:col-span-7">
          <div className="rounded-[24px] bg-paper p-6 sm:p-8">
            <h3 className="serif text-[1.375rem] leading-tight">{t("What is saved, and where")}</h3>
            <p className="mt-2 text-ink-2">{t("Some tools remember your entries so they are still there next time. They are kept in your browser’s local storage, on this device only:")}</p>
            <ul className="m-0 mt-4 grid list-none gap-2 p-0" data-testid="stored-list">
              {STORED.map((s) => (
                <li key={s.tool} className="ui flex flex-wrap gap-x-2 text-[0.9375rem]">
                  <span className="font-semibold">{s.tool}:</span>
                  <span className="text-ink-2">{tv(s.what)}</span>
                </li>
              ))}
            </ul>
            <p className="ui mt-4 text-[0.875rem] text-muted">{t("Each of these tools can clear what it saved, and clearing this site’s data in your browser removes everything.")}</p>
          </div>
          <div className="rounded-[24px] bg-paper p-6 sm:p-8">
            <h3 className="serif text-[1.375rem] leading-tight">{t("What other services see")}</h3>
            <p className="mt-2 text-ink-2">{t("The site is hosted on GitHub Pages, and its fonts load from Google Fonts. Like any website, they receive your IP address and browser details when the page loads, under their own privacy policies. They never receive what you enter into a calculator. Links to official sources open those sites directly.")}</p>
          </div>
          <div className="rounded-[24px] bg-warn-soft p-6 sm:p-8" data-testid="pricing-disclaimer">
            <h3 className="serif text-[1.375rem] leading-tight">{t("Prices and rates are estimates")}</h3>
            <p className="mt-2">{t("Prices, rates and financial information are updated regularly from published sources. They are provided for estimation and comparison only, not as final or authoritative quotations. Always confirm the latest rates, terms and charges with the provider or official source.")}</p>
            <p className="mt-3 text-[0.9375rem] text-ink-2">{t("This applies to internet plans, electricity rates, appliance estimates, toll fees, subscription prices and every other figure here. Each tool shows its sources and the date they were checked.")}</p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
