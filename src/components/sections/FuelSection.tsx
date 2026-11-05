import { useRef, useState, type KeyboardEvent } from 'react'
import { AnimatePresence } from 'motion/react'
import { FuelChart } from '../../charts/lazy'
import { FUELS, fuel, latestFuel, latestOf } from '../../data'
import type { FuelKey } from '../../types/data'
import { dateLabel, monthLabel, pct, perLiter } from '../../utils/format'
import { Reveal, motion } from '../ui/motion'
import { StatusTag } from '../ui/Status'

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
    <section id="gas" aria-labelledby="gas-title" className="pt-[clamp(24px,4vw,56px)]">
      <div className="wrap">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <Reveal>
            <h1 id="gas-title" className="text-[clamp(2rem,4vw,3.75rem)] leading-[1.05]">
              <span className="block text-muted">Magkano na ang gas?</span>
              <span className="block">Fuel prices, {latestFuel.effectiveDate.slice(0, 4)}</span>
            </h1>
          </Reveal>
          <Reveal delay={0.06} className="max-w-[26rem]">
            <StatusTag status={fuel.status} extra={`DOE Oil Monitor, latest ${dateLabel(latestFuel.effectiveDate)}`} />
            <p className="ui mt-2 text-[0.875rem] text-ink-2">
              Retrieved {dateLabel(fuel.retrievedAt)}. Nationwide adjustment ranges; pump prices differ by area and station.
            </p>
          </Reveal>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-[150px_1fr] md:gap-10">
          <div role="tablist" aria-label="Fuel type" aria-orientation="vertical" className="sticky top-[76px] z-10 grid grid-cols-3 gap-1.5 self-start bg-ground py-1 md:static md:grid-cols-1">
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
                  className={`ui flex min-h-16 flex-col justify-center px-3.5 py-2 text-left transition-colors ${on ? 'bg-ink text-ground' : 'bg-surface hover:bg-surface-2'}`}
                >
                  <span className="text-base font-semibold">{f.label}</span>
                  {ytd != null && <span className="text-[0.8125rem] tabular opacity-90">{perLiter(ytd, ytd)} this year</span>}
                </button>
              )
            })}
          </div>

          <div id="fuel-panel" role="tabpanel" aria-labelledby={`tab-${active}`} className="min-w-0">
            <AnimatePresence mode="wait">
              <motion.div key={active} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                <ol className="m-0 grid list-none gap-1 p-0" aria-label={`${label} weekly adjustments, newest first`}>
                  {weeks.slice(0, 6).map((w) => {
                    const r = w[active]
                    const up = r.max > 0
                    return (
                      <li key={w.effectiveDate} className="grid min-h-[76px] grid-cols-1 items-center gap-1 px-5 py-3 odd:bg-paper even:bg-surface sm:grid-cols-[11rem_1fr_auto] sm:gap-6">
                        <span className="ui tabular text-[1.125rem] font-medium">{dateLabel(w.effectiveDate)}</span>
                        <span>
                          <span className={`ui block text-[1.125rem] font-semibold tabular ${r.max === 0 && r.min === 0 ? '' : up ? 'text-loss' : 'text-gain'}`}>
                            {r.max === 0 && r.min === 0 ? 'No change' : `${up ? 'Increase' : 'Rollback'} ${perLiter(r.min, r.max)}`}
                          </span>
                          <span className="ui block text-[0.875rem] text-muted">{r.min === r.max ? 'Same across oil companies' : 'Range across oil companies'}</span>
                        </span>
                        {w.ytdNet && <span className="ui text-[0.9375rem] tabular sm:text-right">{perLiter(w.ytdNet[active], w.ytdNet[active])} since January</span>}
                      </li>
                    )
                  })}
                </ol>
                <div className="mt-12 bg-paper p-4 sm:p-6">
                  <FuelChart adjustments={fuel.adjustments} fuel={active} label={label} />
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="mt-[clamp(72px,8vw,120px)] grid gap-8 md:grid-cols-12">
          <figure className="relative m-0 overflow-hidden md:col-span-5">
            <img
              src={`${BASE}images/pump-board-800.webp`}
              srcSet={`${BASE}images/pump-board-800.webp 800w, ${BASE}images/pump-board-1400.webp 1400w`}
              sizes="(min-width: 768px) 40vw, 100vw"
              width={800}
              height={600}
              loading="lazy"
              alt="A roadside price board at a fuel station listing diesel and gasoline prices"
              className="photo-mono aspect-[4/3] w-full object-cover"
            />
            <figcaption className="ui mt-2 text-[0.875rem] text-muted">A station price board in 2022. The prices shown are not current.</figcaption>
          </figure>
          <div className="md:col-span-6 md:col-start-7">
            <h3 className="text-[clamp(1.5rem,1.2rem+1vw,2.25rem)]">A fuel hike is not the inflation rate</h3>
            <dl className="mt-6 grid gap-5">
              <div>
                <dt className="ui font-semibold">Peso-per-liter change</dt>
                <dd className="m-0 mt-1 text-ink-2">What DOE reports each week: how many pesos a liter went up or down. Shown above.</dd>
              </div>
              <div>
                <dt className="ui font-semibold">Percentage change and price level</dt>
                <dd className="m-0 mt-1 text-ink-2">
                  A percent change needs a pump price to divide by, and DOE publishes those per area, not as one national price. We
                  do not invent a nationwide price, so no percentage is shown.
                </dd>
              </div>
              <div>
                <dt className="ui font-semibold">Transport inflation</dt>
                <dd className="m-0 mt-1 text-ink-2">
                  PSA's transport CPI covers fuel, fares and vehicles together. It rose {pct(transport.value)} year on year in{' '}
                  {monthLabel(transport.period)}.
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </section>
  )
}
