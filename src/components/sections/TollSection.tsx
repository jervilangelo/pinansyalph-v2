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
import { ArrowUpDown, Bookmark, BookmarkCheck, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { computeRoundTrip, computeToll, fuelCost, parsePlazaKey, plazaKey, searchPlazas, type PlazaOption, type TollTrip } from '../../calculators/toll'
import tollJson from '../../data/tolls.json'
import { Link } from '../../router'
import type { Expressway, TollConfidence, TollDataset, VehicleClass } from '../../types/toll'
import { dateLabel, peso, pesoExact } from '../../utils/format'
import { ToolHeader } from '../layout/Page'
import { Combobox, type ComboOption } from '../ui/Combobox'
import { Disclosure } from '../ui/Disclosure'
import { NumberField, Segmented } from '../ui/fields'
import { DUR, EASE, motion, useReducedMotion } from '../ui/motion'
import { CalcGrid, Panel, ResultHero } from '../ui/Result'
import { StatusTag } from '../ui/Status'
import { tx } from '../../i18n/react'
import { t, tv } from '../../i18n'

const tollData = tollJson as TollDataset

type Trip = 'one-way' | 'round-trip'
interface SavedRoute {
  from: string
  to: string
  cls: VehicleClass
}

const SAVED_KEY = 'pp-toll-routes'
const MAX_SAVED = 6

/** Common trips, as a first step for someone who has not picked yet. */
const POPULAR: { label: string; from: string; to: string }[] = [
  { label: 'Manila → Baguio', from: 'nlex-sctex/balintawak', to: 'tplex/rosario' },
  { label: 'Manila → Subic', from: 'nlex-sctex/balintawak', to: 'nlex-sctex/tipo-subic' },
  { label: 'Manila → Clark', from: 'nlex-sctex/balintawak', to: 'nlex-sctex/clark-south' },
  { label: 'Makati → Calamba', from: 'skyway-slex/magallanes-slex', to: 'skyway-slex/calamba' },
  { label: 'Alabang → Batangas', from: 'skyway-slex/alabang', to: 'star/batangas-city' },
  { label: 'Alabang → Tagaytay', from: 'skyway-slex/alabang', to: 'calax/sta-rosa-tagaytay' },
]

const CONFIDENCE: Record<TollConfidence, string> = {
  'cross-checked': 'Checked against news reports of the TRB approval',
  'single-source': 'One published transcription of the TRB matrix',
  provisional: 'Provisional rates approved by TRB',
}

const byKey = new Map<string, PlazaOption>()
for (const x of tollData.expressways) for (const p of x.plazas) byKey.set(plazaKey({ expressway: x.id, plaza: p.id }), { key: plazaKey({ expressway: x.id, plaza: p.id }), ref: { expressway: x.id, plaza: p.id }, plaza: p, expressway: x })

const toOption = (o: PlazaOption): ComboOption => ({ id: o.key, label: `${o.plaza.name}, ${o.expressway.name}`, hint: o.expressway.long })
const optionFor = (key: string | null) => {
  const o = key ? byKey.get(key) : undefined
  return o ? toOption(o) : null
}

function readSaved(): SavedRoute[] {
  try {
    const raw = JSON.parse(localStorage.getItem(SAVED_KEY) ?? '[]')
    return Array.isArray(raw) ? raw.filter((r) => byKey.has(r?.from) && byKey.has(r?.to) && [1, 2, 3].includes(r?.cls)).slice(0, MAX_SAVED) : []
  } catch {
    return []
  }
}
function writeSaved(list: SavedRoute[]) {
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(list))
  } catch {
    /* private mode: saving is a convenience only */
  }
}

const routeName = (r: SavedRoute) => `${byKey.get(r.from)?.plaza.name} → ${byKey.get(r.to)?.plaza.name}`
const sameRoute = (a: SavedRoute, b: SavedRoute) => a.from === b.from && a.to === b.to && a.cls === b.cls
const listNames = (names: string[]) => (names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`)

export function TollSection() {
  const [from, setFrom] = useState<string | null>(null)
  const [to, setTo] = useState<string | null>(null)
  const [cls, setCls] = useState<VehicleClass>(1)
  const [trip, setTrip] = useState<Trip>('one-way')
  // Remounts the two search boxes when both ends change at once (swap, saved route).
  const [pickKey, setPickKey] = useState(0)
  const [saved, setSaved] = useState<SavedRoute[]>(readSaved)
  const [fuelOpen, setFuelOpen] = useState(false)
  const [distance, setDistance] = useState(0)
  const [economy, setEconomy] = useState(10)
  const [price, setPrice] = useState(0)

  const load = (f: string | null, t: string | null, c?: VehicleClass) => {
    setFrom(f)
    setTo(t)
    if (c) setCls(c)
    setPickKey((k) => k + 1)
  }

  const fromRef = from ? parsePlazaKey(from) : null
  const toRef = to ? parsePlazaKey(to) : null
  const result = useMemo(() => {
    if (!fromRef || !toRef) return null
    return trip === 'round-trip' ? computeRoundTrip(tollData, fromRef, toRef, cls) : computeToll(tollData, fromRef, toRef, cls)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, cls, trip])

  const current: SavedRoute | null = from && to ? { from, to, cls } : null
  const isSaved = !!current && saved.some((r) => sameRoute(r, current))
  const toggleSave = () => {
    if (!current) return
    const next = isSaved ? saved.filter((r) => !sameRoute(r, current)) : [current, ...saved].slice(0, MAX_SAVED)
    setSaved(next)
    writeSaved(next)
  }
  const removeSaved = (r: SavedRoute) => {
    const next = saved.filter((x) => !sameRoute(x, r))
    setSaved(next)
    writeSaved(next)
  }

  const tollTotal = result?.ok ? result.total : 0
  const fuel = useMemo(() => {
    if (!fuelOpen || distance <= 0 || economy <= 0 || price <= 0) return null
    try {
      return fuelCost(trip === 'round-trip' ? distance * 2 : distance, economy, price)
    } catch {
      return null
    }
  }, [fuelOpen, distance, economy, price, trip])

  const search = (q: string) => searchPlazas(tollData, q).map(toOption)
  const classInfo = tollData.classes.find((c) => c.id === cls)!

  const inputs = (
    <Panel as="form" title={t("Your trip")}>
      <div className="grid gap-5">
        {saved.length > 0 && (
          <div className="ui">
            <p className="field-label">{t("Saved routes")}</p>
            <ul className="m-0 flex list-none flex-wrap gap-2 p-0" data-testid="saved-routes">
              {saved.map((r) => (
                <li key={`${r.from}-${r.to}-${r.cls}`} className="flex items-center rounded-full bg-surface">
                  <button type="button" onClick={() => load(r.from, r.to, r.cls)} className="cursor-pointer rounded-full border-0 bg-transparent py-2 pr-1 pl-3.5 text-[0.875rem] font-semibold text-ink hover:text-accent">
                    {routeName(r)} <span className="font-medium text-muted">{tx("· Class {cls}", { cls: (r.cls), })}</span>
                  </button>
                  <button type="button" onClick={() => removeSaved(r)} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-muted hover:text-ink">
                    <X aria-hidden="true" size={14} />
                    <span className="sr-only">{tx("Remove {r}", { r: (routeName(r)), })}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="relative grid gap-3">
          <Combobox
            key={`from-${pickKey}`}
            label={t("Saan ka papasok? (Entry)")}
            value={optionFor(from)}
            onChange={(o) => setFrom(o?.id ?? null)}
            search={search}
            placeholder={t("Toll plaza, city or place, e.g. Balintawak")}
            emptyText={(q) => <>{tx("No toll plaza matches “{q}”. Try the town or the expressway name.", { q: (q), })}</>}
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => load(to, from)}
              disabled={!from && !to}
              className="ui -my-1 flex min-h-11 cursor-pointer items-center gap-2 rounded-full border-0 bg-surface px-4 text-[0.875rem] font-semibold text-ink transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ArrowUpDown aria-hidden="true" size={16} />{t("Swap entry and exit")}</button>
          </div>
          <Combobox
            key={`to-${pickKey}`}
            label={t("Saan ka lalabas? (Exit)")}
            value={optionFor(to)}
            onChange={(o) => setTo(o?.id ?? null)}
            search={search}
            placeholder={t("e.g. Rosario for Baguio")}
            emptyText={(q) => <>{tx("No toll plaza matches “{q}”. Try the town or the expressway name.", { q: (q), })}</>}
          />
        </div>

        <div>
          <Segmented<`${VehicleClass}`>
            label={t("Vehicle class")}
            value={String(cls) as `${VehicleClass}`}
            onChange={(v) => setCls(Number(v) as VehicleClass)}
            options={tollData.classes.map((c) => ({ value: String(c.id) as `${VehicleClass}`, label: c.label }))}
          />
          <p className="field-hint">{tv(classInfo.description)}.</p>
        </div>

        <Segmented<Trip>
          label={t("Trip")}
          value={trip}
          onChange={setTrip}
          options={[
            { value: 'one-way', label: t("One way") },
            { value: 'round-trip', label: t("Balikan") },
          ]}
        />

        <Disclosure title={t("Add fuel cost (optional)")} summary={fuel ? peso(fuel.cost) : undefined} tone="ground" size="sm" open={fuelOpen} onOpenChange={setFuelOpen} id="fuel-cost">
          <div className="grid gap-4 sm:grid-cols-3">
            <NumberField label={t("Distance, one way")} suffix="km" value={distance} onChange={setDistance} min={0} max={5000} step={1} />
            <NumberField label={t("Fuel economy")} suffix="km/L" value={economy} onChange={setEconomy} min={1} max={100} step={0.1} />
            <NumberField label={t("Fuel price")} suffix="₱/L" value={price} onChange={setPrice} min={0} max={500} step={0.01} />
          </div>
          <p className="ui mt-3 text-[0.8125rem] leading-relaxed text-muted">{tx("Use your car’s real figures and today’s pump price. Distance is your whole drive, not only the expressway. Weekly DOE price changes are on the {link}.", { link: (<Link to="/gas" className="font-semibold text-accent underline underline-offset-2">{t("Gas page")}</Link>), })}</p>
        </Disclosure>
      </div>
    </Panel>
  )

  let answer
  if (!result) {
    answer = (
      <div className="card p-6 sm:p-8" data-testid="toll-empty">
        <h2 className="text-[1.5rem] leading-tight">{t("Pick an entry and an exit")}</h2>
        <p className="ui mt-2 text-[0.9375rem] leading-relaxed text-muted">{t("Search by toll plaza, town or landmark. Or start from a common trip:")}</p>
        <ul className="ui m-0 mt-5 flex list-none flex-wrap gap-2 p-0">
          {POPULAR.map((r) => (
            <li key={r.label}>
              <button type="button" onClick={() => load(r.from, r.to)} className="min-h-11 cursor-pointer rounded-full border-0 bg-surface px-4 text-[0.9375rem] font-semibold text-ink transition-colors hover:bg-accent-soft hover:text-accent">
                {tv(r.label)}
              </button>
            </li>
          ))}
        </ul>
      </div>
    )
  } else if (!result.ok) {
    answer = (
      <p role="status" className="ui rounded-[22px] bg-warn-soft p-5 leading-relaxed text-ink" data-testid="toll-error">
        {tv(result.message)}
      </p>
    )
  } else {
    const legsOut = 'out' in result ? result.out : result
    const label = trip === 'round-trip' ? `Toll, balikan · Class ${cls}` : `Toll, one way · Class ${cls}`
    answer = (
      <div className="grid gap-4" data-testid="toll-result">
        <ResultHero
          label={tv(label)}
          value={result.total}
          format={peso}
          testId="toll-total"
          aside={
            <button
              type="button"
              onClick={toggleSave}
              aria-pressed={isSaved}
              className="ui flex min-h-11 cursor-pointer items-center gap-2 rounded-full border-0 bg-white/15 px-4 text-[0.875rem] font-semibold text-white transition-colors hover:bg-white/25"
            >
              {isSaved ? <BookmarkCheck aria-hidden="true" size={16} /> : <Bookmark aria-hidden="true" size={16} />}
              {isSaved ? t("Saved") : t("Save route")}
            </button>
          }
          caption={
            <>{tx("{name} to {name2}{v2}, via {listNames}.{v4}", { name: (tv(legsOut.legs[0].from.name)), name2: (tv(legsOut.legs[legsOut.legs.length - 1].to.name)), v2: (trip === 'round-trip' ? t(" and back") : ''), listNames: (listNames(legsOut.route.map((x) => x.name))), v4: (trip === 'round-trip' && <>{tx("One way: {total}.", { total: (peso(legsOut.total)), })}</>), })}</>
          }
        />
        <RouteRibbon trip={legsOut} title={trip === 'round-trip' ? t("Toll breakdown, one way") : t("Toll breakdown")} />
        <RfidPanel byRfid={result.byRfid} roundTrip={trip === 'round-trip'} />
        {fuel && (
          <div className="card p-5 sm:p-6" data-testid="travel-cost">
            <p className="ui text-[0.9375rem] font-semibold text-ink-2">{tx("Total travel cost{v0}", { v0: (trip === 'round-trip' ? t(", balikan") : ''), })}</p>
            <p className="figure mt-2 text-[2.25rem] leading-none" data-testid="travel-total">
              {pesoExact(fuel.cost.plus(tollTotal))}
            </p>
            <p className="ui mt-2 text-[0.875rem] text-muted">{tx("Toll {tollTotal} + fuel {cost} ({v2} L at your price).", { tollTotal: (peso(tollTotal)), cost: (pesoExact(fuel.cost)), v2: (fuel.liters.toString()), })}</p>
          </div>
        )}
        <SourceNote route={legsOut.route} />
      </div>
    )
  }

  return (
    <section id="toll" aria-labelledby="toll-title">
      <ToolHeader
        path="/magkano-ang-toll"
        id="toll-title"
        title={t("Magkano ang Toll Ko?")}
        lede={
          <>{tx("{span} Expressway tolls for NLEX, SCTEX, TPLEX, Skyway, SLEX, STAR, CALAX and CAVITEX, from the rates approved by the Toll Regulatory Board.", { span: (<span className="font-semibold text-ink">{t("Alamin ang toll fee bago bumiyahe.")}</span>), })}</>
        }
        meta={<StatusTag status="verified-secondary" extra={t("TRB rates, compiled {compiledOn}", { compiledOn: dateLabel(tollData.compiledOn) })} />}
      />

      <div className="wrap grid gap-4">
        <CalcGrid inputs={inputs} result={<div className="grid scroll-mt-24 gap-4" aria-live="polite">{answer}</div>} />

        <div className="grid gap-3">
          <Disclosure title={t("Expressways and rate dates")} size="lg" headingLevel={2} id="toll-rates">
            <ul className="ui m-0 grid list-none gap-2 p-0">
              {tollData.expressways.map((x) => (
                <li key={x.id} className="grid gap-1 rounded-[18px] bg-ground px-4 py-3.5 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-6">
                  <span>
                    <span className="block font-semibold">
                      {tv(x.name)} <span className="font-normal text-muted">· {tv(x.long)}</span>
                    </span>
                    <span className="block text-[0.8125rem] text-muted">{tx("{operator} · {rfid} · {length} plazas · {v3}", { operator: (x.operator), rfid: (x.rfid), length: (x.plazas.length), v3: (CONFIDENCE[x.confidence]), })}</span>
                    {x.note && <span className="mt-1 block text-[0.8125rem] text-ink-2">{tv(x.note)}</span>}
                  </span>
                  <span className="text-[0.9375rem] font-semibold sm:text-right">{tx("Effective {effective}", { effective: (dateLabel(x.effective)), })}</span>
                </li>
              ))}
            </ul>
            <p className="ui mt-4 text-[0.875rem] font-semibold">{t("Not included yet")}</p>
            <ul className="ui mt-1 grid gap-1 pl-5 text-[0.875rem] text-ink-2">
              {tollData.notIncluded.map((n) => (
                <li key={n.name}>
                  <span className="font-semibold">{tv(n.name)}:</span> {tv(n.reason)}
                </li>
              ))}
            </ul>
          </Disclosure>

          <Disclosure title={t("How the toll is computed")} size="lg" headingLevel={2} id="toll-method">
            <div className="grid max-w-[76ch] gap-4 text-[0.9375rem] leading-relaxed text-ink-2">
              <p>{t("Each expressway charges from where you enter it to where you leave it, using its own TRB matrix for your vehicle class. A trip across several expressways adds one fare per expressway, joined where the roads meet: NLEX and TPLEX at Tarlac (La Paz), NLEX and Skyway Stage 3 at Balintawak, Skyway Stage 3 and the Skyway at Buendia, SLEX and STAR at Sto. Tomas, and SLEX and CALAX at Mamplasan.")}</p>
              <p>{t("NLEX and SCTEX are one toll system, and so are the Skyway and SLEX. A trip within either is charged once, from entry to exit, never as two separate tolls.")}</p>
              <p>{t("A round trip computes the return on its own. Fares are VAT inclusive and in whole pesos. A pair of plazas with no published fare is shown as not possible, because some ramps only run in one direction.")}</p>
              <p>{t("The RFID amount is the toll paid through each account: Easytrip for NLEX Corporation roads (NLEX, SCTEX, NLEX Connector, CALAX, CAVITEX) and Autosweep for San Miguel roads (Skyway, SLEX, STAR, TPLEX). They are separate accounts, so each needs enough load. Operators may also require a minimum balance; check with them.")}</p>
              <p>{tollData.provenance}</p>
              <ul className="m-0 grid gap-1 pl-5">
                {tollData.checks.map((c) => (
                  <li key={`${c.expressway}-${c.from}-${c.to}`}>
                    <a href={c.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-accent underline underline-offset-2">
                      {c.source}
                    </a>
                  </li>
                ))}
              </ul>
              <p className="text-[0.875rem] text-muted">{t("Estimates only. Toll rates can change; the amount charged at the plaza is final.")}</p>
            </div>
          </Disclosure>
        </div>
      </div>
    </section>
  )
}

/** The trip as a line: entry, each expressway leg with its fare, exit. */
function RouteRibbon({ trip, title }: { trip: TollTrip; title: string }) {
  const reduce = useReducedMotion()
  return (
    <Panel title={tv(title)}>
      <ol className="ui m-0 list-none p-0" data-testid="toll-breakdown">
        <AnimatePresence initial={false}>
          {trip.legs.map((l, i) => (
            <motion.li
              key={`${l.expressway.id}-${l.from.id}-${l.to.id}`}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0, transition: { duration: DUR.base, ease: EASE, delay: reduce ? 0 : i * 0.06 } }}
              className="relative grid grid-cols-[20px_1fr_auto] gap-x-3 pb-5 last:pb-0"
            >
              <span aria-hidden="true" className="relative flex justify-center">
                <span className="mt-1.5 h-3 w-3 rounded-full border-[3px] border-accent bg-paper" />
                <span className="absolute top-5 bottom-[-6px] w-[3px] rounded-full bg-accent/25" />
              </span>
              <span className="min-w-0">
                <span className="block text-[1rem] font-semibold">{tv(l.expressway.name)}</span>
                <span className="block text-[0.875rem] text-muted">
                  {tv(l.from.name)} → {tv(l.to.name)} · {l.expressway.rfid}
                </span>
              </span>
              <span className="tabular text-[1.0625rem] font-semibold">{peso(l.fare)}</span>
            </motion.li>
          ))}
        </AnimatePresence>
        <li className="grid grid-cols-[20px_1fr_auto] gap-x-3 pt-1">
          <span aria-hidden="true" className="flex justify-center">
            <span className="mt-1.5 h-3 w-3 rounded-full bg-accent" />
          </span>
          <span className="font-semibold">{tx("Exit at {name}", { name: (tv(trip.legs[trip.legs.length - 1].to.name)), })}</span>
          <span className="tabular text-[1.0625rem] font-semibold">{peso(trip.total)}</span>
        </li>
      </ol>
    </Panel>
  )
}

function RfidPanel({ byRfid, roundTrip }: { byRfid: { rfid: string; total: number }[]; roundTrip: boolean }) {
  return (
    <div className="card p-5 sm:p-6">
      <h2 className="ui text-[1rem] font-semibold">{tx("Load your RFID{v0}", { v0: (roundTrip ? t(" for the balikan") : ''), })}</h2>
      <dl className="m-0 mt-3 grid gap-3 sm:grid-cols-2" data-testid="rfid">
        {byRfid.map((r) => (
          <div key={r.rfid} className="rounded-[18px] bg-ground px-4 py-3">
            <dt className="ui text-[0.875rem] font-semibold text-ink-2">{r.rfid}</dt>
            <dd className="figure m-0 mt-1 text-[1.625rem] leading-tight">{peso(r.total)}</dd>
          </div>
        ))}
      </dl>
      <p className="ui mt-3 text-[0.8125rem] leading-relaxed text-muted">{t("The least each tag needs for these tolls. Easytrip and Autosweep are separate accounts, so a balance on one cannot pay the other.")}</p>
    </div>
  )
}

function SourceNote({ route }: { route: Expressway[] }) {
  const flagged = route.filter((x) => x.confidence !== 'cross-checked')
  return (
    <p className="ui px-1 text-[0.8125rem] leading-relaxed text-muted" data-testid="toll-source">{tx("TRB rates effective {listNames}.{v1} {link}", { listNames: (listNames(route.map((x) => `${dateLabel(x.effective)} (${x.name})`))), v1: (flagged.map((x) => (
        <span key={x.id}>
          {' '}
          {tv(x.name)}: {CONFIDENCE[x.confidence].toLowerCase()}.
        </span>
      ))), link: (<a href="#toll-rates" className="font-semibold text-accent underline underline-offset-2">{t("Sources and dates")}</a>), })}</p>
  )
}
