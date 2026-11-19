/*
 * PinansyalPH (https://pinansyalph.site/)
 * Copyright (c) 2026 Jervil Angelo De Leon. All rights reserved.
 *
 * This source code is proprietary to its author. Copying,
 * reproducing, modifying, distributing, publishing or reusing it, in whole or
 * in part, without the author's prior written permission is not allowed.
 * See the LICENSE file at the root of this repository.
 */

import { ArrowRight, ArrowUpRight, Heart } from 'lucide-react'
import { AnimatedSymbol } from '../components/brand/Logo'
import { Constellation } from '../components/home/Constellation'
import { ToolMark } from '../components/brand/ToolMark'
import { Page } from '../components/layout/Page'
import { useSupport } from '../components/support/Support'
import { AnimatedNumber, Reveal, SplitWords, motion, useEnter } from '../components/ui/motion'
import { StatusTag } from '../components/ui/Status'
import { basePurchasingPowerYear, fuel, inflation, latestFuel, latestHeadline, latestMp2, latestPurchasingPower, savingsBaseRange } from '../data'
import { GROUPS, Link, TOOLS } from '../router'
import { TAGLINE } from '../site'
import { useSplashGone } from '../splash'
import { dateLabel, monthLabel, perLiter } from '../utils/format'
import { tx } from '../i18n/react'
import { t, tv } from '../i18n'

const BASE = import.meta.env.BASE_URL

function Hero({ ready }: { ready: boolean }) {
  const enter = useEnter()
  return (
    <header className="wrap grid items-center gap-10 pt-8 pb-4 sm:pt-12 lg:grid-cols-12 lg:gap-12 lg:pt-14">
      {/* Keyed so the entrance replays once the splash has gone. */}
      <div key={ready ? 'shown' : 'covered'} className="lg:col-span-5">
        <h1 className="max-w-[12ch] text-[clamp(2.75rem,1.6rem+3.4vw,4.5rem)] leading-[0.98] tracking-[-0.035em]">
          <SplitWords text={TAGLINE} delay={0.35} />
        </h1>
        <motion.p {...enter(0.6)} className="mt-6 max-w-[36ch] text-step-lead leading-snug text-ink-2">{tx("PinansyalPH is a free Filipino money toolkit: {length} tools for your salary, savings, the prices you pay and your monthly bills, built on official Philippine data.", { length: (TOOLS.length), })}</motion.p>
        <motion.div {...enter(0.7)} className="mt-8 flex flex-wrap items-center gap-3">
          <a href="#tools" className="btn btn-primary group">{t("Explore the tools")}<ArrowRight aria-hidden="true" size={18} className="transition-transform duration-300 ease-[var(--ease-out-quint)] group-hover:translate-x-1" />
          </a>
          <Link to="/about" className="btn btn-soft">{t("About the project")}</Link>
        </motion.div>
        <motion.p {...enter(0.8)} className="ui mt-6 text-[0.875rem] text-muted">{t("No signup, no login. Your numbers stay on your device.")}</motion.p>
      </div>
      <motion.div {...enter(0.2)} key={ready ? 'c-shown' : 'c-covered'} className="lg:col-span-7">
        <Constellation />
      </motion.div>
    </header>
  )
}

/* ------------------------------------------------------------------ */

/**
 * The tool index: an editorial table of contents, not a grid of cards. Each
 * group is a column label in large serif; its tools are numbered rows on
 * hairline rules, with the tool's own mark and, where the homepage already has
 * it, the latest official figure the tool is built on.
 */
function toolFigure(path: string): { value: string; label: string } | null {
  if (path === '/inflation') return { value: `${latestHeadline.value.toFixed(1)}%`, label: monthLabel(latestHeadline.period, true) }
  if (path === '/mp2') return { value: `${latestMp2.rate.toFixed(2)}%`, label: t('{year} dividend', { year: latestMp2.year }) }
  if (path === '/gas') return { value: perLiter(latestFuel.diesel.min, latestFuel.diesel.max), label: 'diesel change this week' }
  if (path === '/banks') return { value: `${savingsBaseRange.min}–${savingsBaseRange.max}%`, label: 'base rates' }
  return null
}

function Tools() {
  let n = 0
  return (
    <section id="tools" aria-labelledby="tools-title" className="wrap mt-[clamp(96px,11vw,170px)] scroll-mt-24">
      <Reveal className="grid gap-6 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-7">
          <h2 id="tools-title" className="text-step-head max-w-[16ch]">{t("What do you want to know?")}</h2>
          <p className="mt-4 max-w-[46ch] text-step-lead leading-snug text-ink-2">{tx("{length} tools for your pay, your savings, the prices you pay and where your money goes. Each opens with the answer, then shows its working.", { length: (TOOLS.length), })}</p>
        </div>
        <nav aria-label={t("Tool categories")} className="lg:col-span-5">
          <ul className="ui m-0 flex list-none flex-wrap gap-x-1 gap-y-2 p-0 lg:justify-end">
            {GROUPS.map((g) => (
              <li key={g.id}>
                <a
                  href={`#group-${g.id}`}
                  className="group flex items-baseline gap-1.5 rounded-full px-3 py-2 text-[0.9375rem] font-semibold text-ink-2 transition-colors hover:bg-paper hover:text-accent"
                >
                  {tv(g.label)}
                  <span className="tabular text-[0.75rem] font-medium text-muted">{TOOLS.filter((t) => t.group === g.id).length}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </Reveal>

      <div className="mt-[clamp(48px,6vw,88px)] border-t-2 border-ink">
        {GROUPS.map((g) => {
          const tools = TOOLS.filter((t) => t.group === g.id)
          return (
            <div key={g.id} id={`group-${g.id}`} className="scroll-mt-24 border-b border-line">
              <Reveal className="grid gap-x-10 py-8 sm:py-10 lg:grid-cols-12">
                <div className="mb-4 lg:col-span-3 lg:mb-0">
                  <h3 className="text-[clamp(2.25rem,1.6rem+2.2vw,3.5rem)] leading-[0.95] tracking-[-0.03em]">{tv(g.label)}</h3>
                  <p className="ui mt-2 text-[0.875rem] font-semibold tracking-[0.08em] text-accent uppercase">{tv(g.gloss)}</p>
                  <p className="ui mt-1 max-w-[24ch] text-[0.9375rem] text-muted">{tv(g.question)}</p>
                </div>
                <ol className="m-0 list-none p-0 lg:col-span-9">
                  {tools.map((t) => {
                    n += 1
                    const fig = toolFigure(t.path)
                    return (
                      <li key={t.path} className="border-t border-line first:border-t-0 lg:first:border-t-0">
                        <Link
                          to={t.path}
                          className="tool-row group relative grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 py-4 sm:grid-cols-[2.5rem_auto_minmax(0,1fr)_auto] sm:gap-x-5 sm:py-5"
                        >
                          <span aria-hidden="true" className="figure hidden text-[0.9375rem] text-muted tabular-nums transition-colors group-hover:text-accent sm:block">
                            {String(n).padStart(2, '0')}
                          </span>
                          <ToolMark path={t.path} size={44} className="transition-transform duration-500 ease-[var(--ease-out-quint)] group-hover:-translate-y-0.5 group-hover:scale-105" />
                          <span className="min-w-0">
                            <span className="serif block text-[clamp(1.25rem,1.05rem+0.8vw,1.75rem)] leading-tight tracking-[-0.015em] transition-colors group-hover:text-accent">{tv(t.name)}</span>
                            <span className="ui mt-1 block text-[0.9375rem] leading-snug text-muted">{tv(t.blurb)}</span>
                            {fig && (
                              <span className="ui mt-2 flex items-baseline gap-2 text-[0.875rem] md:hidden">
                                <span className="tabular font-semibold text-ink">{fig.value}</span>
                                <span className="text-muted">{tv(fig.label)}</span>
                              </span>
                            )}
                          </span>
                          <span className="flex items-center gap-5">
                            {fig && (
                              <span className="hidden text-right md:block">
                                <span className="figure block text-[1.375rem] leading-none whitespace-nowrap">{fig.value}</span>
                                <span className="ui mt-1 block text-[0.75rem] text-muted">{tv(fig.label)}</span>
                              </span>
                            )}
                            <span className="flex h-10 w-10 items-center justify-center rounded-full text-muted transition-[background-color,color,transform] duration-300 ease-[var(--ease-out-quint)] group-hover:translate-x-1 group-hover:bg-accent group-hover:text-white">
                              <ArrowRight aria-hidden="true" size={18} />
                            </span>
                          </span>
                        </Link>
                      </li>
                    )
                  })}
                </ol>
              </Reveal>
            </div>
          )
        })}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */

function Numbers() {
  const centavos = Math.round(latestPurchasingPower.value * 100)
  const diesel = latestFuel.diesel
  const tiles = [
    {
      to: '/inflation',
      label: 'Inflation',
      value: <AnimatedNumber value={latestHeadline.value} format={(n) => `${n.toFixed(1)}%`} />,
      body: `Prices in ${monthLabel(latestHeadline.period)} were ${latestHeadline.value.toFixed(1)}% higher than a year earlier.`,
      source: `PSA · retrieved ${dateLabel(inflation.retrievedAt)}`,
      status: <StatusTag status={inflation.status} />,
    },
    {
      to: '/mp2',
      label: 'MP2 dividend',
      value: <AnimatedNumber value={latestMp2.rate} format={(n) => `${n.toFixed(2)}%`} />,
      body: `Declared by Pag-IBIG for ${latestMp2.year}. Rates are set yearly and not guaranteed.`,
      source: latestMp2.declaredOn ? `Pag-IBIG Fund · announced ${dateLabel(latestMp2.declaredOn)}` : 'Pag-IBIG Fund',
      status: <StatusTag status="historical" />,
    },
    {
      to: '/gas',
      label: 'Diesel this week',
      value: perLiter(diesel.min, diesel.max),
      body: `DOE adjustment effective ${dateLabel(latestFuel.effectiveDate)}, per liter, across oil companies.`,
      source: `DOE Oil Monitor · retrieved ${dateLabel(fuel.retrievedAt)}`,
      status: <StatusTag status={fuel.status} />,
    },
    {
      to: '/inflation',
      label: `Your ₱1 from ${basePurchasingPowerYear}`,
      value: <AnimatedNumber value={centavos} format={(n) => `${Math.round(n)}¢`} />,
      body: `is what it buys today, by PSA’s purchasing power of the peso (${monthLabel(latestPurchasingPower.period)}).`,
      source: `PSA · ${basePurchasingPowerYear} = ₱1.00`,
      status: <StatusTag status={inflation.status} />,
    },
  ]
  return (
    <section aria-labelledby="numbers-title" className="wrap mt-[clamp(96px,11vw,170px)]">
      <div className="grid gap-4 lg:grid-cols-12">
        <Reveal className="flex flex-col lg:col-span-5">
          <h2 id="numbers-title" className="text-step-head">{t("Latest official numbers")}</h2>
          <p className="mt-4 max-w-[40ch] text-ink-2">{t("Published figures from PSA, DOE and Pag-IBIG, each with its date. They refresh automatically when the agencies release new data, and are never estimated.")}</p>
          <figure className="relative m-0 mt-8 min-h-[260px] flex-1 overflow-hidden rounded-[28px] bg-surface-2">
            <img
              src={`${BASE}images/jeepney-1400.webp`}
              srcSet={`${BASE}images/jeepney-800.webp 800w, ${BASE}images/jeepney-1400.webp 1400w`}
              sizes="(min-width: 1024px) 40vw, 100vw"
              width={1400}
              height={1050}
              loading="lazy"
              alt={t("A jeepney turning at a sunny Manila street corner under tangled power lines")}
              className="absolute inset-0 h-full w-full object-cover object-[62%_60%] transition-transform duration-[1400ms] ease-[var(--ease-out-quint)] hover:scale-[1.03]"
            />
            <figcaption className="ui absolute bottom-3 left-3 rounded-full bg-paper/95 px-3 py-1.5 text-[0.8125rem] font-medium">{t("Pedro Gil, Manila")}</figcaption>
          </figure>
        </Reveal>
        <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 lg:col-span-7">
          {tiles.map((t, i) => (
            <Reveal as="li" key={t.label} delay={0.06 * i} className="flex">
              <Link to={t.to} className="group flex w-full flex-col rounded-[28px] bg-paper p-6 transition-colors duration-300 hover:bg-accent-soft sm:p-7">
                <span className="flex items-center justify-between gap-3">
                  <span className="ui text-[0.9375rem] font-semibold">{tv(t.label)}</span>
                  <ArrowUpRight
                    aria-hidden="true"
                    size={20}
                    className="text-muted transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent"
                  />
                </span>
                <span className="figure mt-5 block text-[clamp(2.25rem,1.8rem+1.6vw,3.25rem)] leading-none">{t.value}</span>
                <span className="mt-3 block text-[0.9375rem] leading-relaxed text-ink-2">{tv(t.body)}</span>
                <span className="ui mt-auto block pt-5 text-[0.8125rem] leading-relaxed text-muted">
                  {tv(t.source)}
                  <span className="mt-1 block">{t.status}</span>
                </span>
              </Link>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */

function FreeForAll() {
  const { openSupport } = useSupport()
  return (
    <section aria-labelledby="open-title" className="wrap mt-[clamp(96px,11vw,170px)]">
      <Reveal className="grid gap-8 rounded-[32px] bg-accent-soft p-6 sm:p-10 lg:grid-cols-12 lg:items-end lg:p-14">
        <div className="lg:col-span-8">
          <AnimatedSymbol size={56} play={false} />
          <h2 id="open-title" className="text-step-head mt-6 max-w-[18ch]">{t("Free, for everyone.")}</h2>
          <p className="mt-4 max-w-[54ch] text-step-lead leading-snug text-ink-2">{t("No ads, no accounts, no login. Every number shows its official source and how it was computed.")}</p>
        </div>
        <div className="flex flex-wrap gap-3 lg:col-span-4 lg:justify-end">
          <button type="button" onClick={openSupport} className="btn btn-primary">
            <Heart aria-hidden="true" size={18} />{t("Support the project")}</button>
          <Link to="/about" className="btn btn-paper">{t("About PinansyalPH")}</Link>
        </div>
      </Reveal>
    </section>
  )
}

export function HomePage() {
  // Replay the hero's entrance once the splash has gone, so it is seen rather than played underneath.
  const ready = useSplashGone()
  return (
    <Page path="/" next={false}>
      <Hero ready={ready} />
      <Tools />
      <Numbers />
      <FreeForAll />
    </Page>
  )
}
