/*
 * PinansyalPH (https://pinansyalph.site/)
 * Copyright (c) 2026 Jervil Angelo De Leon. All rights reserved.
 *
 * This source code is proprietary to its author. Copying,
 * reproducing, modifying, distributing, publishing or reusing it, in whole or
 * in part, without the author's prior written permission is not allowed.
 * See the LICENSE file at the root of this repository.
 */

import { useRef, useState, type KeyboardEvent } from 'react'
import { AnimatePresence } from 'motion/react'
import { FuelChart } from '../../charts/lazy'
import { FUELS, fuel, latestFuel, latestOf } from '../../data'
import type { FuelKey } from '../../types/data'
import { dateLabel, monthLabel, pct, perLiter } from '../../utils/format'
import { motion } from '../ui/motion'
import { ToolHeader } from '../layout/Page'
import { StatusTag } from '../ui/Status'
import { tx } from '../../i18n/react'
import { t, tv } from '../../i18n'

const BASE = import.meta.env.BASE_URL

export function FuelSection() {
  const [active, setActive] = useState<FuelKey>('diesel')
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const transport = latestOf('transport')
  const label = FUELS.find((f) => f.key === active)!.label
  const weeks = [...fuel.adjustments].reverse()

  function onKey(e: KeyboardEvent, i: number) {
    const dir = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0
    if (!dir) return
    e.preventDefault()
    const next = (i + dir + FUELS.length) % FUELS.length
    setActive(FUELS[next].key)
    tabs.current[next]?.focus()
  }

  return (
    <section id="gas" aria-labelledby="gas-title">
      <ToolHeader
        path="/gas"
        id="gas-title"
        title={t("Magkano na ang gas?")}
        lede={<>{tx("Weekly pump price adjustments for {v0}, from the DOE Oil Monitor. Nationwide ranges; your station's price may differ.", { v0: (latestFuel.effectiveDate.slice(0, 4)), })}</>}
        meta={
          <>
            <StatusTag status={fuel.status} extra={t("DOE Oil Monitor, latest {effectiveDate}", { effectiveDate: dateLabel(latestFuel.effectiveDate) })} />
            <p className="ui mt-1 text-[0.8125rem] text-muted">{tx("Retrieved {retrievedAt}.", { retrievedAt: (dateLabel(fuel.retrievedAt)), })}</p>
          </>
        }
      />
      <div className="wrap">
        <div className="grid gap-4 md:grid-cols-[200px_1fr] md:gap-6">
          <div role="tablist" aria-label={t("Fuel type")} aria-orientation="vertical" className="sticky top-[var(--header-h)] z-10 grid grid-cols-3 gap-1.5 self-start rounded-[22px] bg-ground py-2 md:static md:grid-cols-1 md:py-0">
            {FUELS.map((f, i) => {
              const on = f.key === active
              const ytd = latestFuel.ytdNet?.[f.key]
              return (
                <button
                  key={f.key}
                  ref={(el) => {
                    tabs.current[i] = el
                  }}
                  role="tab"
                  id={`tab-${f.key}`}
                  aria-selected={on}
                  aria-controls="fuel-panel"
                  tabIndex={on ? 0 : -1}
                  onClick={() => setActive(f.key)}
                  onKeyDown={(e) => onKey(e, i)}
                  className={`ui flex min-h-16 cursor-pointer flex-col justify-center rounded-[18px] border-0 px-4 py-2.5 text-left transition-colors ${on ? 'bg-ink text-ground' : 'bg-paper text-ink hover:bg-surface'}`}
                >
                  <span className="text-base font-semibold">{tv(f.label)}</span>
                  {ytd != null && <span className="text-[0.8125rem] tabular opacity-90">{tx("{ytd} this year", { ytd: (perLiter(ytd, ytd)), })}</span>}
                </button>
              )
            })}
          </div>

          <div id="fuel-panel" role="tabpanel" aria-labelledby={`tab-${active}`} className="min-w-0">
            <AnimatePresence mode="wait">
              <motion.div key={active} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                <ol className="card m-0 grid list-none gap-1 p-2 sm:p-3" aria-label={t("{label} weekly adjustments, newest first", { label })}>
                  {weeks.slice(0, 6).map((w) => {
                    const r = w[active]
                    const up = r.max > 0
                    return (
                      <li key={w.effectiveDate} className="grid min-h-[76px] grid-cols-1 items-center gap-1 rounded-[16px] px-4 py-3 odd:bg-ground sm:grid-cols-[11rem_1fr_auto] sm:gap-6">
                        <span className="ui tabular text-[1.125rem] font-medium">{dateLabel(w.effectiveDate)}</span>
                        <span>
                          <span className={`ui block text-[1.125rem] font-semibold tabular ${r.max === 0 && r.min === 0 ? '' : up ? 'text-loss' : 'text-gain'}`}>
                            {r.max === 0 && r.min === 0 ? t("No change") : `${up ? t('Increase') : t('Rollback')} ${perLiter(r.min, r.max)}`}
                          </span>
                          <span className="ui block text-[0.875rem] text-muted">{r.min === r.max ? t("Same across oil companies") : t("Range across oil companies")}</span>
                        </span>
                        {w.ytdNet && <span className="ui text-[0.9375rem] tabular sm:text-right">{tx("{active} since January", { active: (perLiter(w.ytdNet[active], w.ytdNet[active])), })}</span>}
                      </li>
                    )
                  })}
                </ol>
                <div className="card mt-4 p-4 sm:p-6">
                  <FuelChart adjustments={fuel.adjustments} fuel={active} label={tv(label)} />
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="mt-[clamp(80px,9vw,140px)] grid gap-8 md:grid-cols-12 md:items-center">
          <figure className="relative m-0 overflow-hidden md:col-span-5">
            <img
              src={`${BASE}images/pump-board-800.webp`}
              srcSet={`${BASE}images/pump-board-800.webp 800w, ${BASE}images/pump-board-1400.webp 1400w`}
              sizes="(min-width: 768px) 40vw, 100vw"
              width={800}
              height={600}
              loading="lazy"
              alt={t("A roadside price board at a fuel station listing diesel and gasoline prices")}
              className="aspect-[4/3] w-full rounded-[28px] object-cover"
            />
            <figcaption className="ui mt-3 px-1 text-[0.875rem] text-muted">{t("A station price board in 2022. The prices shown are not current.")}</figcaption>
          </figure>
          <div className="md:col-span-6 md:col-start-7">
            <h2 className="text-step-head">{t("A fuel hike is not the inflation rate")}</h2>
            <dl className="mt-8 grid gap-6">
              <div>
                <dt className="ui font-semibold">{t("Peso-per-liter change")}</dt>
                <dd className="m-0 mt-1 text-ink-2">{t("What DOE reports each week: how many pesos a liter went up or down. Shown above.")}</dd>
              </div>
              <div>
                <dt className="ui font-semibold">{t("Percentage change and price level")}</dt>
                <dd className="m-0 mt-1 text-ink-2">{t("A percent change needs a pump price to divide by, and DOE publishes those per area, not as one national price. We do not invent a nationwide price, so no percentage is shown.")}</dd>
              </div>
              <div>
                <dt className="ui font-semibold">{t("Transport inflation")}</dt>
                <dd className="m-0 mt-1 text-ink-2">{tx("PSA's transport CPI covers fuel, fares and vehicles together. It rose {value} year on year in {period}.", { value: (pct(transport.value)), period: (monthLabel(transport.period)), })}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </section>
  )
}
