/*
 * PinansyalPH (https://pinansyalph.site/)
 * Copyright (c) 2026 Jervil Angelo De Leon. All rights reserved.
 *
 * This source code is proprietary to its author. Copying,
 * reproducing, modifying, distributing, publishing or reusing it, in whole or
 * in part, without the author's prior written permission is not allowed.
 * See the LICENSE file at the root of this repository.
 */

import { useEffect, useMemo, useState } from 'react'
import { GROUP_LABELS, GROUP_ORDER, checkBill, explanations, kwhFromReadings, type BillResult, type LineGroup } from '../../../calculators/electricity'
import { D, InputError } from '../../../calculators/money'
import { monthLabel, peso, pesoExact, pesoSigned } from '../../../utils/format'
import { Disclosure } from '../../ui/Disclosure'
import { AmountField, NumberField, OptionalAmountField, Segmented } from '../../ui/fields'
import { CalcGrid, Panel, ResultHero } from '../../ui/Result'
import { priceKwh, scheduleFor, type Tariff } from './tariff'
import { tx } from '../../../i18n/react'
import { t, tv } from '../../../i18n'

type Mode = 'kwh' | 'readings'

const BAND_TEXT = {
  match: { title: 'Tugma sa published rates', tone: 'bg-gain-soft text-gain' },
  close: { title: 'Malapit, may kaunting diperensya', tone: 'bg-surface text-ink' },
  higher: { title: 'Mas mataas ang bill mo', tone: 'bg-loss-soft text-loss' },
  lower: { title: 'Mas mababa ang bill mo', tone: 'bg-accent-soft text-accent' },
} as const

export function CheckBill({ tariff, onKwh }: { tariff: Tariff; onKwh: (kwh: number) => void }) {
  const [mode, setMode] = useState<Mode>('kwh')
  const [kwhInput, setKwhInput] = useState(0)
  const [prev, setPrev] = useState(0)
  const [curr, setCurr] = useState(0)
  const [mult, setMult] = useState(1)
  const [days, setDays] = useState(0)
  const [billed, setBilled] = useState(0)
  const [items, setItems] = useState<Partial<Record<LineGroup, number | null>>>({})

  // kWh from the bill, or from the two readings.
  const reading = useMemo(() => {
    if (mode === 'kwh') return { kwh: kwhInput > 0 ? Math.round(kwhInput) : 0, error: null as string | null }
    if (!prev && !curr) return { kwh: 0, error: null }
    try {
      return { kwh: kwhFromReadings(prev, curr, mult), error: null }
    } catch (e) {
      return { kwh: 0, error: e instanceof InputError ? e.message : 'Check the readings.' }
    }
  }, [mode, kwhInput, prev, curr, mult])
  const kwh = reading.kwh

  useEffect(() => onKwh(kwh), [kwh, onKwh])

  const priced = priceKwh(tariff, kwh)
  const schedule = tariff.provider === 'meralco' ? scheduleFor(tariff.month) : undefined
  const check = useMemo(() => {
    if (!schedule || !kwh || !(billed > 0)) return null
    try {
      return checkBill(schedule, kwh, billed, { lifeline: tariff.lifeline, lftRate: tariff.lftRate })
    } catch {
      return null
    }
  }, [schedule, kwh, billed, tariff.lifeline, tariff.lftRate])

  const inputs = (
    <Panel as="form" title={t("Your bill")}>
      <div className="grid gap-5">
        <Segmented<Mode>
          label={t("Consumption")}
          value={mode}
          onChange={setMode}
          options={[
            { value: 'kwh', label: t("kWh on my bill") },
            { value: 'readings', label: t("Meter readings") },
          ]}
        />
        {mode === 'kwh' ? (
          <NumberField label={t("Total kWh used")} suffix="kWh" value={kwhInput} onChange={setKwhInput} min={0} max={100000} step={1} hint={t("Printed as “kWh consumption” or “Total kWh” on your bill.")} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            <NumberField label={t("Previous reading")} value={prev} onChange={setPrev} min={0} max={10_000_000} step={1} />
            <NumberField label={t("Present reading")} value={curr} onChange={setCurr} min={0} max={10_000_000} step={1} />
            <NumberField label={t("Multiplier")} value={mult} onChange={setMult} min={0.01} max={10000} step={1} hint={t("Usually 1.")} />
          </div>
        )}
        {reading.error && (
          <p role="alert" className="ui -mt-2 text-[0.875rem] text-loss">
            {reading.error}
          </p>
        )}
        {mode === 'readings' && kwh > 0 && (
          <p className="ui -mt-2 text-[0.9375rem]" data-testid="kwh-from-readings">
            ({curr.toLocaleString('en-PH')} − {prev.toLocaleString('en-PH')}) × {mult} = <strong>{tx("{v0} kWh", { v0: (kwh.toLocaleString('en-PH')), })}</strong>
          </p>
        )}
        <AmountField label={t("Current charges on your bill")} value={billed} onChange={setBilled} hint={t("This month’s charges only, not “Total amount due” (which can include unpaid balances).")} />
        <NumberField label={t("Days in the billing period (optional)")} suffix="days" value={days} onChange={setDays} min={0} max={62} step={1} />

        {schedule && (
          <Disclosure title={t("Compare line by line (optional)")} tone="ground" size="sm" id="itemized">
            <p className="ui mb-4 text-[0.875rem] leading-relaxed text-muted">{t("Copy the subtotals from the “Breakdown of charges” on your bill. Leave a line empty if your bill does not show it.")}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {GROUP_ORDER.map((g) => (
                <OptionalAmountField key={g} label={tv(GROUP_LABELS[g])} value={items[g] ?? null} onChange={(v) => setItems((x) => ({ ...x, [g]: v }))} compact />
              ))}
            </div>
          </Disclosure>
        )}
      </div>
    </Panel>
  )

  let result
  if (!kwh) {
    result = (
      <div className="card p-6 sm:p-8" data-testid="bill-empty">
        <h2 className="text-[1.5rem] leading-tight">{t("Enter your kWh")}</h2>
        <p className="ui mt-2 text-[0.9375rem] leading-relaxed text-muted">{tx("Use the kWh on your bill, or your meter’s previous and present readings. Add the current charges to see how your bill compares with {v0}.", { v0: (tariff.provider === 'meralco' ? t("Meralco’s {month} rates", { month: monthLabel(tariff.month) }) : t("your rate")), })}</p>
      </div>
    )
  } else if (!priced) {
    result = (
      <p role="status" className="ui rounded-[22px] bg-warn-soft p-5">{t("Enter your rate per kWh to estimate the bill.")}</p>
    )
  } else {
    const diff = billed > 0 ? new D(billed).minus(priced.total) : null
    result = (
      <div className="grid gap-4" data-testid="bill-result">
        <ResultHero
          label={priced.estimate ? t("Estimated bill") : t("Expected bill")}
          value={priced.total.toNumber()}
          format={pesoExact}
          testId="expected-bill"
          caption={
            <>{tx("{v0} kWh at {label}: ₱{v2} per kWh.{v3}", { v0: (kwh.toLocaleString('en-PH')), label: (tv(priced.label)), v2: (priced.perKwh.toFixed(4)), v3: (priced.estimate && t(" An estimate: your rate times your kWh, without the line-by-line tariff.")), })}</>
          }
        />

        {check ? (
          <div className="card p-5 sm:p-6" data-testid="bill-check">
            <p className={`ui inline-flex rounded-full px-3 py-1 text-[0.875rem] font-semibold ${BAND_TEXT[check.band].tone}`}>{tv(BAND_TEXT[check.band].title)}</p>
            <dl className="m-0 mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Fig label={t("Your bill")} value={pesoExact(check.billed)} />
              <Fig label={t("Difference")} value={pesoSigned(check.difference, true)} testId="bill-difference" />
              <Fig label={t("In percent")} value={`${check.percent > 0 ? '+' : check.percent < 0 ? '−' : ''}${Math.abs(check.percent).toFixed(2)}%`} testId="bill-percent" />
            </dl>
            <p className="ui mt-4 text-[0.875rem] leading-relaxed text-muted">{tx("Usual range for this kWh: {low} to {high}, depending on your city’s local franchise tax.", { low: (pesoExact(check.range.low)), high: (pesoExact(check.range.high)), })}</p>
            <h3 className="ui mt-5 text-[1rem] font-semibold">{check.band === 'match' ? t("What this means") : t("Possible reasons")}</h3>
            <ul className="ui m-0 mt-2 grid gap-1.5 pl-5 text-[0.9375rem] leading-relaxed text-ink-2">
              {explanations(check, { days: days || undefined }).map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        ) : diff ? (
          <div className="card p-5 sm:p-6" data-testid="bill-check">
            <dl className="m-0 grid grid-cols-2 gap-4">
              <Fig label={t("Your bill")} value={pesoExact(billed)} />
              <Fig label={t("Difference from the estimate")} value={pesoSigned(diff, true)} testId="bill-difference" />
            </dl>
            <p className="ui mt-3 text-[0.875rem] text-muted">{t("With a typed rate this is only a rough comparison: real bills add fixed charges, taxes and tiers.")}</p>
          </div>
        ) : null}

        {priced.bill && <Breakdown bill={priced.bill} items={items} />}
      </div>
    )
  }

  return <CalcGrid inputs={inputs} result={<div className="grid gap-4" aria-live="polite">{result}</div>} />
}

function Fig({ label, value, testId }: { label: string; value: string; testId?: string }) {
  return (
    <div>
      <dt className="ui text-[0.8125rem] font-medium text-muted">{tv(label)}</dt>
      <dd className="figure m-0 mt-1 text-[1.375rem] leading-tight" data-testid={testId}>
        {value}
      </dd>
    </div>
  )
}

function Breakdown({ bill, items }: { bill: BillResult; items: Partial<Record<LineGroup, number | null>> }) {
  const entered = GROUP_ORDER.filter((g) => items[g] != null)
  const itemized = entered.length > 0
  return (
    // Remounts (open) as soon as the visitor enters a line from their bill.
    <Disclosure key={itemized ? 'itemized' : 'expected'} title={itemized ? t("Line-by-line comparison") : t("Breakdown of the expected bill")} summary={peso(bill.total)} id="bill-breakdown" defaultOpen={itemized}>
      {itemized && (
        <p className="ui mb-3 text-[0.875rem] text-muted">
          {entered.length === GROUP_ORDER.length ? t("Every group entered: an itemized check.") : t("{length} of {length2} groups entered; the others are not compared.", { length: entered.length, length2: GROUP_ORDER.length })}
        </p>
      )}
      <div className="grid gap-3" data-testid="bill-lines">
        {bill.groups.map((g) => {
          const mine = items[g.group]
          const d = mine != null ? new D(mine).minus(g.amount) : null
          return (
            <div key={g.group} className="rounded-[16px] bg-ground px-4 py-3">
              <div className="ui flex items-baseline justify-between gap-3">
                <span className="font-semibold">{tv(g.label)}</span>
                <span className="tabular font-semibold">{pesoExact(g.amount)}</span>
              </div>
              {d && (
                <p className={`ui mt-1 text-[0.8125rem] ${d.abs().lte(1) ? 'text-gain' : 'text-loss'}`}>{tx("Your bill: {pesoExact} ({v1})", { pesoExact: (pesoExact(mine!)), v1: (d.abs().lte(0.01) ? 'same' : pesoSigned(d, true)), })}</p>
              )}
              <ul className="ui m-0 mt-1.5 grid list-none gap-0.5 p-0 text-[0.8125rem] text-muted">
                {bill.lines
                  .filter((l) => l.group === g.group)
                  .map((l) => (
                    <li key={l.key} className="flex justify-between gap-3">
                      <span>{tv(l.label)}</span>
                      <span className="tabular">{pesoExact(l.amount)}</span>
                    </li>
                  ))}
              </ul>
            </div>
          )
        })}
      </div>
    </Disclosure>
  )
}
