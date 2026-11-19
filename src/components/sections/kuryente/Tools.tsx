/*
 * PinansyalPH (https://pinansyalph.site/)
 * Copyright (c) 2026 Jervil Angelo De Leon. All rights reserved.
 *
 * This source code is proprietary to its author. Copying,
 * reproducing, modifying, distributing, publishing or reusing it, in whole or
 * in part, without the author's prior written permission is not allowed.
 * See the LICENSE file at the root of this repository.
 */

import { Plus, Trash2 } from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import { APPLIANCE_PRESETS, applianceKwh, estimateAppliances, kwhSaved, type Appliance, type Change } from '../../../calculators/appliances'
import { compareBills, residentialBill } from '../../../calculators/electricity'
import { D, type Dec } from '../../../calculators/money'
import { monthLabel, peso, pesoExact, pesoSigned } from '../../../utils/format'
import { AmountField, NumberField, Segmented, SelectField } from '../../ui/fields'
import { DUR, EASE, motion, useReducedMotion } from '../../ui/motion'
import { CalcGrid, Panel, ResultHero, Stat } from '../../ui/Result'
import { LATEST, MERALCO, priceKwh, scheduleFor, type Tariff } from './tariff'
import { tx } from '../../../i18n/react'
import { t, tv } from '../../../i18n'

const kwhText = (k: Dec | number) => `${new D(k).toDecimalPlaces(1).toNumber().toLocaleString('en-PH')} kWh`

// ── Appliances ─────────────────────────────────────────────────────────

let seq = 0
const newId = (key: string) => `${key}-${++seq}`

export function AppliancesTab({ tariff, appliances, setAppliances }: { tariff: Tariff; appliances: Appliance[]; setAppliances: (a: Appliance[]) => void }) {
  const [preset, setPreset] = useState(APPLIANCE_PRESETS[0].key)
  const reduce = useReducedMotion()
  const add = () => {
    const p = APPLIANCE_PRESETS.find((x) => x.key === preset)
    const a: Appliance = p
      ? { id: newId(p.key), name: p.name, watts: p.watts, quantity: 1, hoursPerDay: p.hoursPerDay, daysPerMonth: p.daysPerMonth, runningShare: p.runningShare }
      : { id: newId('custom'), name: 'My appliance', watts: 100, quantity: 1, hoursPerDay: 1, daysPerMonth: 30, runningShare: 1 }
    setAppliances([...appliances, a])
  }
  const update = (id: string, patch: Partial<Appliance>) => setAppliances(appliances.map((a) => (a.id === id ? { ...a, ...patch } : a)))
  const remove = (id: string) => setAppliances(appliances.filter((a) => a.id !== id))

  const result = useMemo(() => {
    if (!appliances.length) return null
    try {
      const totalKwh = appliances.reduce((s, a) => s.plus(applianceKwh(a)), new D(0))
      const priced = priceKwh(tariff, Math.max(1, Math.round(totalKwh.toNumber())))
      if (!priced) return { error: 'Enter your rate per kWh to price the appliances.' }
      return { ...estimateAppliances(appliances, priced.perKwh), priced }
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Check the appliance figures.' }
    }
  }, [appliances, tariff])

  const inputs = (
    <Panel title={t("Your appliances")} intro={t("Start from a typical appliance and edit it to match yours. The label on the appliance shows its watts (or volts × amps).")}>
      <div className="ui flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <SelectField label={t("Add an appliance")} value={preset} onChange={setPreset} options={[...APPLIANCE_PRESETS.map((p) => ({ value: p.key, label: p.name })), { value: 'custom', label: t("Other (custom)") }]} />
        </div>
        <button type="button" onClick={add} className="btn btn-primary min-h-12 shrink-0">
          <Plus aria-hidden="true" size={18} />{' '}{t("Add")}</button>
      </div>
      <ul className="m-0 mt-5 grid list-none gap-3 p-0" data-testid="appliance-list">
        {appliances.map((a) => (
          <motion.li key={a.id} initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: { duration: DUR.base, ease: EASE } }} className="rounded-[20px] bg-ground p-4">
            <ApplianceRow a={a} onChange={(p) => update(a.id, p)} onRemove={() => remove(a.id)} />
          </motion.li>
        ))}
      </ul>
      {!appliances.length && <p className="ui mt-4 text-[0.9375rem] text-muted">{t("No appliances yet. Add the ones you use most: aircon, refrigerator, fans, TV.")}</p>}
    </Panel>
  )

  let out
  if (!result) out = <EmptyCard title={t("Add your appliances")} text={t("Each one shows its kWh a month and its share of the bill, priced with your provider’s rates.")} />
  else if ('error' in result) out = <p className="ui rounded-[22px] bg-warn-soft p-5" role="status">{result.error}</p>
  else {
    const max = Math.max(...result.items.map((i) => i.kwh.toNumber()), 0.01)
    out = (
      <div className="grid gap-4" data-testid="appliance-result">
        <ResultHero
          label={t("Estimated from your appliances")}
          value={result.priced.total.toNumber()}
          format={peso}
          testId="appliance-bill"
          caption={
            <>{tx("{totalKwh} a month at {label} ({perKwh}/kWh). An estimate from watts and hours, not a meter reading.", { totalKwh: (kwhText(result.totalKwh)), label: (tv(result.priced.label)), perKwh: (pesoExact(result.priced.perKwh)), })}</>
          }
        />
        <Panel title={t("By appliance")}>
          <ul className="ui m-0 grid list-none gap-3 p-0">
            {[...result.items]
              .sort((x, y) => y.kwh.cmp(x.kwh))
              .map((i) => (
                <li key={i.appliance.id}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 font-semibold">{tv(i.appliance.name)}</span>
                    <span className="tabular shrink-0 font-semibold">{peso(i.cost)}</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface" aria-hidden="true">
                    <motion.div className="h-full rounded-full bg-accent" initial={{ width: 0 }} animate={{ width: `${(i.kwh.toNumber() / max) * 100}%` }} transition={{ duration: DUR.slow, ease: EASE }} />
                  </div>
                  <p className="mt-1 text-[0.8125rem] text-muted">{tx("{kwh} · {v1}% of the total", { kwh: (kwhText(i.kwh)), v1: (Math.round(i.share * 100)), })}</p>
                </li>
              ))}
          </ul>
          <p className="ui mt-4 text-[0.8125rem] leading-relaxed text-muted">{t("Costs share the whole bill at its average rate per kWh. Compare the total with the kWh on your bill: a big gap means a running share or hours need adjusting, or something is missing.")}</p>
        </Panel>
      </div>
    )
  }
  return <CalcGrid inputs={inputs} result={<div className="grid gap-4" aria-live="polite">{out}</div>} />
}

function ApplianceRow({ a, onChange, onRemove }: { a: Appliance; onChange: (p: Partial<Appliance>) => void; onRemove: () => void }) {
  const id = useId()
  const preset = APPLIANCE_PRESETS.find((p) => a.id.startsWith(`${p.key}-`))
  let kwh: string
  try {
    kwh = kwhText(applianceKwh(a))
  } catch {
    kwh = 'Check the figures'
  }
  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-2">
        <label htmlFor={`${id}-name`} className="sr-only">{t("Appliance name")}</label>
        <input id={`${id}-name`} className="field-input min-w-0 flex-1 font-semibold" value={a.name} onChange={(e) => onChange({ name: e.target.value })} />
        <button type="button" onClick={onRemove} className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-paper text-muted hover:text-loss">
          <Trash2 aria-hidden="true" size={17} />
          <span className="sr-only">{tx("Remove {name}", { name: (tv(a.name)), })}</span>
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <NumberField context={tv(a.name)} label={t("Watts")} value={a.watts} onChange={(watts) => onChange({ watts })} min={1} max={20000} step={1} />
        <NumberField context={tv(a.name)} label={t("How many")} value={a.quantity} onChange={(quantity) => onChange({ quantity })} min={1} max={100} step={1} />
        <NumberField context={tv(a.name)} label={t("Hours a day")} value={a.hoursPerDay} onChange={(hoursPerDay) => onChange({ hoursPerDay })} min={0} max={24} step={0.25} />
        <NumberField context={tv(a.name)} label={t("Days a month")} value={a.daysPerMonth} onChange={(daysPerMonth) => onChange({ daysPerMonth })} min={0} max={31} step={1} />
        <NumberField context={tv(a.name)} label={t("Running share")} suffix="%" value={Math.round(a.runningShare * 100)} onChange={(v) => onChange({ runningShare: v / 100 })} min={1} max={100} step={1} />
        <div className="ui flex flex-col justify-end pb-2">
          <span className="text-[0.8125rem] text-muted">{t("A month")}</span>
          <span className="tabular text-[1.0625rem] font-semibold">{kwh}</span>
        </div>
      </div>
      {preset?.note && <p className="ui text-[0.8125rem] leading-snug text-muted">{tv(preset.note)}</p>}
    </div>
  )
}

// ── Compare bills ──────────────────────────────────────────────────────

const NOT_LISTED = 'not-listed'

export function CompareTab() {
  const [a, setA] = useState({ month: MERALCO.schedules[1]?.month ?? NOT_LISTED, kwh: 0, amount: 0 })
  const [b, setB] = useState({ month: LATEST.month, kwh: 0, amount: 0 })
  const ready = a.kwh > 0 && a.amount > 0 && b.kwh > 0 && b.amount > 0
  const c = ready ? compareBills(a, b) : null
  const ref = (m: string) => {
    const s = scheduleFor(m)
    return s ? residentialBill(s, 200).perKwh : null
  }
  const refA = ref(a.month)
  const refB = ref(b.month)
  const monthOpts = [...MERALCO.schedules.map((s) => ({ value: s.month, label: monthLabel(s.month) })), { value: NOT_LISTED, label: 'Another month' }]

  const period = (label: string, v: typeof a, set: (x: typeof a) => void) => (
    <fieldset className="m-0 grid min-w-0 gap-4 rounded-[20px] border-0 bg-ground p-4" data-testid={label === 'Earlier bill' ? 'compare-before' : 'compare-after'}>
      <legend className="ui float-left mb-1 w-full p-0 text-[1rem] font-semibold">{tv(label)}</legend>
      <SelectField label={t("Billing month")} value={v.month} onChange={(month) => set({ ...v, month })} options={monthOpts} />
      <NumberField context={tv(label)} label={t("kWh used")} suffix="kWh" value={v.kwh} onChange={(kwh) => set({ ...v, kwh })} min={0} max={100000} step={1} />
      <AmountField context={tv(label)} label={t("Current charges")} value={v.amount} onChange={(amount) => set({ ...v, amount })} />
    </fieldset>
  )

  const inputs = (
    <Panel title={t("Two bills")} intro={t("Use the kWh and current charges from each bill.")}>
      <div className="grid gap-3 md:grid-cols-2">
        {period('Earlier bill', a, setA)}
        {period('Later bill', b, setB)}
      </div>
    </Panel>
  )

  let out
  if (!c) out = <EmptyCard title={t("Bakit tumaas ang bill ko?")} text={t("Enter both bills to split the change into what you used and what the rate did.")} />
  else {
    const up = c.amountChange.gt(0)
    const total = c.fromUsage.abs().plus(c.fromRate.abs())
    const usageShare = total.isZero() ? 0 : c.fromUsage.abs().div(total).toNumber()
    out = (
      <div className="grid gap-4" data-testid="compare-result">
        <ResultHero
          label={up ? t("Tumaas ang bill mo") : c.amountChange.isZero() ? t("Same bill") : t("Bumaba ang bill mo")}
          value={c.amountChange.abs().toNumber()}
          format={(n) => `${up ? '+' : c.amountChange.isZero() ? '' : '−'}${pesoExact(n)}`}
          tone={up ? 'loss' : 'accent'}
          testId="compare-change"
          caption={<>{c.amountPercent !== null && t("{v0}{v1}% from the earlier bill.", { v0: c.amountPercent > 0 ? '+' : '', v1: c.amountPercent.toFixed(1) })}</>}
        />
        <Panel title={t("Saan galing ang diperensya?")}>
          <div className="flex h-3 overflow-hidden rounded-full bg-surface" aria-hidden="true">
            <div className="h-full bg-accent" style={{ width: `${usageShare * 100}%` }} />
            <div className="h-full bg-sun" style={{ width: `${(1 - usageShare) * 100}%` }} />
          </div>
          <dl className="m-0 mt-4 grid gap-4 sm:grid-cols-2">
            <Stat label={<span className="flex items-center gap-2">{tx("{span}From using {v0} electricity", { span: (<span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-accent" />), v0: (c.kwhChange >= 0 ? t('more') : t('less')), })}</span>} value={pesoSigned(c.fromUsage, true)} note={t("{v0}{v1} kWh × {rateBefore} (earlier rate)", { v0: c.kwhChange >= 0 ? '+' : '−', v1: Math.abs(c.kwhChange).toLocaleString('en-PH'), rateBefore: pesoExact(c.rateBefore) })} testId="from-usage" />
            <Stat label={<span className="flex items-center gap-2">{tx("{span}From the rate per kWh changing", { span: (<span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-sun" />), })}</span>} value={pesoSigned(c.fromRate, true)} note={t("{rateBefore} → {rateAfter} per kWh on {v2} kWh", { rateBefore: pesoExact(c.rateBefore), rateAfter: pesoExact(c.rateAfter), v2: b.kwh.toLocaleString('en-PH') })} testId="from-rate" />
          </dl>
          {refA && refB && a.month !== b.month && (
            <p className="ui mt-4 text-[0.875rem] leading-relaxed text-ink-2" data-testid="meralco-rate-change">{tx("Meralco’s published rate for a typical 200 kWh home went from {refA} ({month}) to {refB} ({month2}) per kWh.", { refA: (pesoExact(refA)), month: (monthLabel(a.month)), refB: (pesoExact(refB)), month2: (monthLabel(b.month)), })}</p>
          )}
          <p className="ui mt-3 text-[0.8125rem] leading-relaxed text-muted">{t("The two parts add up to the change. Your rate per kWh also moves with your kWh, because using more can push you into a higher distribution tier and above 650 kWh adds energy tax.")}</p>
        </Panel>
      </div>
    )
  }
  return <CalcGrid inputs={inputs} result={<div className="grid gap-4" aria-live="polite">{out}</div>} />
}

// ── Save electricity ───────────────────────────────────────────────────

type Kind = Change['kind']

export function SaveTab({ tariff, appliances, billKwh, goToAppliances }: { tariff: Tariff; appliances: Appliance[]; billKwh: number; goToAppliances: () => void }) {
  const fromAppliances = appliances.length ? Math.round(appliances.reduce((s, a) => s + safeKwh(a), 0)) : 0
  const [ownBase, setOwnBase] = useState(0)
  const base = billKwh || ownBase || fromAppliances
  const baseSource = billKwh ? 'from Check my bill' : ownBase ? 'entered here' : fromAppliances ? 'from your appliances' : ''
  const [kind, setKind] = useState<Kind>(appliances.length ? 'hours' : 'daily')
  const [applianceId, setApplianceId] = useState(appliances[0]?.id ?? '')
  const target = appliances.find((a) => a.id === applianceId) ?? appliances[0]
  const [hours, setHours] = useState(target ? Math.max(0, target.hoursPerDay - 2) : 0)
  const [watts, setWatts] = useState(target?.watts ?? 0)
  const [share, setShare] = useState(target ? Math.min(target.runningShare, 0.5) * 100 : 50)
  const [daily, setDaily] = useState(1)
  const needsAppliance = kind !== 'daily'

  const outcome = useMemo(() => {
    if (!base) return null
    try {
      const change: Change =
        kind === 'daily'
          ? { kind, kwhPerDay: daily, days: 30 }
          : kind === 'remove'
            ? { kind, applianceId: target!.id }
            : kind === 'hours'
              ? { kind, applianceId: target!.id, hoursPerDay: hours }
              : { kind, applianceId: target!.id, watts, runningShare: share / 100 }
      if (needsAppliance && !target) return null
      const saved = kwhSaved(appliances, change)
      const after = Math.max(1, Math.round(base - saved.toNumber()))
      const p0 = priceKwh(tariff, base)
      const p1 = priceKwh(tariff, after)
      if (!p0 || !p1) return { error: 'Enter your rate per kWh to price the savings.' }
      return { saved, before: p0, after: p1, afterKwh: after, monthly: p0.total.minus(p1.total) }
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Check the figures.' }
    }
  }, [base, kind, daily, target, hours, watts, share, appliances, tariff, needsAppliance])

  const inputs = (
    <Panel title={t("Try a change")}>
      <div className="grid gap-5">
        <NumberField
          label={t("Your monthly kWh now")}
          suffix="kWh"
          value={base}
          onChange={setOwnBase}
          min={0}
          max={100000}
          step={1}
          hint={baseSource ? t("Using {v0} kWh {baseSource}.", { v0: base.toLocaleString('en-PH'), baseSource }) : t("From your latest bill.")}
        />
        <Segmented<Kind>
          label={t("Change")}
          wrap
          value={kind}
          onChange={setKind}
          options={[
            { value: 'hours', label: t("Fewer hours") },
            { value: 'replace', label: t("Replace or inverter") },
            { value: 'remove', label: t("Stop using") },
            { value: 'daily', label: t("Cut daily kWh") },
          ]}
        />
        {needsAppliance && !appliances.length ? (
          <div className="ui rounded-[18px] bg-ground p-4 text-[0.9375rem]">{t("Add your appliances first.")}{' '}
            <button type="button" onClick={goToAppliances} className="cursor-pointer border-0 bg-transparent p-0 font-semibold text-accent underline underline-offset-2">{t("Go to Appliance calculator")}</button>
          </div>
        ) : needsAppliance && target ? (
          <>
            <SelectField
              label={t("Appliance")}
              value={target.id}
              onChange={(id) => {
                const t = appliances.find((a) => a.id === id)!
                setApplianceId(id)
                setHours(Math.max(0, t.hoursPerDay - 2))
                setWatts(t.watts)
                setShare(Math.min(t.runningShare, 0.5) * 100)
              }}
              options={appliances.map((a) => ({ value: a.id, label: t("{name} ({hoursPerDay} h/day)", { name: a.name, hoursPerDay: a.hoursPerDay }) }))}
            />
            {kind === 'hours' && <NumberField label={t("New hours a day")} value={hours} onChange={setHours} min={0} max={24} step={0.25} hint={t("Now {hoursPerDay} hours a day.", { hoursPerDay: target.hoursPerDay })} />}
            {kind === 'replace' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <NumberField label={t("New unit’s watts")} value={watts} onChange={setWatts} min={1} max={20000} step={1} />
                <NumberField label={t("New running share")} suffix="%" value={share} onChange={setShare} min={1} max={100} step={1} hint={t("Inverter aircons and refrigerators often run at a third to half of their rating.")} />
              </div>
            )}
          </>
        ) : null}
        {kind === 'daily' && <NumberField label={t("kWh less each day")} suffix="kWh" value={daily} onChange={setDaily} min={0.1} max={500} step={0.1} hint={t("For example, 1 kWh is a 1,000 W aircon for one hour less.")} />}
      </div>
    </Panel>
  )

  let out
  if (!base) out = <EmptyCard title={t("Magkano ang matitipid mo?")} text={t("Enter your monthly kWh, or fill in Check my bill or your appliances first.")} />
  else if (!outcome) out = <EmptyCard title={t("Choose a change")} text={t("Pick an appliance and what you would change.")} />
  else if ('error' in outcome) out = <p className="ui rounded-[22px] bg-warn-soft p-5" role="status">{outcome.error}</p>
  else
    out = (
      <div className="grid gap-4" data-testid="save-result">
        <ResultHero
          label={t("Matitipid mo kada buwan")}
          value={Math.max(0, outcome.monthly.toNumber())}
          format={pesoExact}
          testId="save-monthly"
          caption={
            <>{tx("{saved} less a month: from {v1} to {v2} kWh.", { saved: (kwhText(outcome.saved)), v1: (base.toLocaleString('en-PH')), v2: (outcome.afterKwh.toLocaleString('en-PH')), })}</>
          }
        />
        <div className="card grid gap-4 p-5 sm:grid-cols-3 sm:p-6">
          <dl className="contents">
            <Stat label={t("In a year")} value={pesoExact(outcome.monthly.times(12))} testId="save-yearly" note={t("12 months at the same rates and use.")} />
            <Stat label={t("Bill now")} value={pesoExact(outcome.before.total)} />
            <Stat label={t("Bill after")} value={pesoExact(outcome.after.total)} />
          </dl>
        </div>
        <p className="ui px-1 text-[0.8125rem] leading-relaxed text-muted">{tx("Priced with {label}, so a drop into a lower distribution tier is counted. Appliance savings are estimates from watts, hours and running share. Rates change every month; the yearly figure assumes they stay the same.", { label: (tv(outcome.before.label)), })}</p>
      </div>
    )
  return <CalcGrid inputs={inputs} result={<div className="grid gap-4" aria-live="polite">{out}</div>} />
}

function safeKwh(a: Appliance): number {
  try {
    return applianceKwh(a).toNumber()
  } catch {
    return 0
  }
}

function EmptyCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="card p-6 sm:p-8">
      <h2 className="text-[1.5rem] leading-tight">{tv(title)}</h2>
      <p className="ui mt-2 text-[0.9375rem] leading-relaxed text-muted">{text}</p>
    </div>
  )
}
