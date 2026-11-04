import { useMemo, useState, type ReactNode } from 'react'
import { calculateSavings } from '../../calculators/savings'
import { ComparisonChart } from '../../charts/lazy'
import { MP2_COLOR, SERIES } from '../../charts/common'
import { banks, mp2 } from '../../data'
import { safe, type ScenarioState } from '../../hooks/useScenario'
import { peso, pesoSigned } from '../../utils/format'
import { Segmented } from '../ui/fields'
import { Reveal } from '../ui/motion'

/** Projection start date, fixed for the session. */
const today = new Date().toISOString().slice(0, 10)

/** Colour follows the entity: each option keeps its slot whatever is toggled. */
const OPTIONS = [{ id: 'mp2', label: 'Pag-IBIG MP2' }, ...banks.products.map((p) => ({ id: p.id, label: `${p.bank} ${p.product}` }))]
const colorOf = (id: string) => (id === 'mp2' ? MP2_COLOR : SERIES[banks.products.findIndex((p) => p.id === id) % SERIES.length])

export function CompareSection({ s }: { s: ScenarioState }) {
  const [mode, setMode] = useState<'real' | 'nominal'>('real')
  const [showMp2, setShowMp2] = useState(true)
  const recurring = s.scenario.monthly > 0

  const results = useMemo(() => {
    return banks.products
      .filter((p) => s.compareIds.includes(p.id))
      .map((p) => ({
        p,
        r: safe(() =>
          calculateSavings({
            initial: s.scenario.initial,
            monthly: s.scenario.monthly,
            years: s.scenario.years,
            product: p,
            inflationPct: s.inflation.rate,
            startDate: today,
          }),
        ),
      }))
  }, [s.compareIds, s.scenario, s.inflation.rate])

  const toggle = (id: string) => {
    if (id === 'mp2') return setShowMp2((v) => !v)
    s.setCompareIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))
  }

  const m = s.mp2Result
  // Reference line: what goes in each month (the bank convention), in pesos or in today's pesos.
  const reference = contributionsByYear(s, mode)

  const series = [
    ...(showMp2 && m.ok
      ? [{ id: 'mp2', label: 'Pag-IBIG MP2', color: colorOf('mp2'), points: [0, ...m.value.rows.map((r) => (mode === 'real' ? r.realTotal : r.nominalTotal).toNumber())] }]
      : []),
    ...results
      .filter((x) => x.r.ok && !(x.p.kind === 'time-deposit' && recurring))
      .map((x) => {
        const v = (x as { r: { ok: true; value: ReturnType<typeof calculateSavings> } }).r.value
        return {
          id: x.p.id,
          label: `${x.p.bank} ${x.p.product}`,
          color: colorOf(x.p.id),
          points: [0, ...v.rows.map((row) => (mode === 'real' ? row.realBalance : row.balance).toNumber())],
        }
      }),
  ]

  return (
    <section id="compare" aria-labelledby="compare-title" className="mt-[clamp(120px,14vw,240px)] px-[var(--gutter)]">
      <div className="bg-surface px-5 py-14 sm:px-8 lg:px-[6%] lg:py-24">
        <div className="grid gap-8 lg:grid-cols-12">
          <Reveal className="lg:col-span-5">
            <h2 id="compare-title" className="text-step-head">
              MP2 vs digital banks
            </h2>
          </Reveal>
          <Reveal delay={0.08} className="lg:col-span-7">
            <p className="max-w-[56ch]">
              The same {peso(s.scenario.monthly)} a month{s.scenario.initial > 0 ? ` and ${peso(s.scenario.initial)} upfront` : ''} for{' '}
              {s.scenario.years} years, under {s.inflation.label}. Banks use their base rates after the {banks.tax.ratePct}% tax;
              MP2 uses the dividend rate you chose above, tax-free. The highest line is not automatically the best choice: read
              the notes below.
            </p>
          </Reveal>
        </div>

        <div className="mt-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <fieldset className="ui m-0 min-w-0 border-0 p-0">
            <legend className="mb-3 p-0 text-[0.9375rem] font-medium">Show options</legend>
            <div className="flex flex-wrap gap-2">
              {OPTIONS.map((opt) => {
                const product = banks.products.find((p) => p.id === opt.id)
                const disabled = product?.kind === 'time-deposit' && recurring
                const checked = opt.id === 'mp2' ? showMp2 : s.compareIds.includes(opt.id)
                return (
                  <label
                    key={opt.id}
                    className={`flex min-h-11 cursor-pointer items-center gap-2.5 px-3.5 py-2 text-[0.9375rem] transition-colors ${checked && !disabled ? 'bg-ink text-ground' : 'bg-paper hover:bg-ground'} ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
                    title={disabled ? 'Time deposits take one placement; set the monthly amount to ₱0 to compare.' : undefined}
                  >
                    <input type="checkbox" className="sr-only" checked={checked} disabled={disabled} onChange={() => toggle(opt.id)} />
                    <span aria-hidden="true" className="inline-block h-3 w-3 rounded-full" style={{ background: colorOf(opt.id) }} />
                    {opt.label}
                    {disabled && <span className="sr-only"> (unavailable with monthly deposits)</span>}
                  </label>
                )
              })}
            </div>
          </fieldset>
          <div className="w-full max-w-[22rem] shrink-0">
            <Segmented
              label="Measure"
              value={mode}
              onChange={setMode}
              options={[
                { value: 'real', label: "Today's pesos" },
                { value: 'nominal', label: 'Pesos' },
              ]}
            />
          </div>
        </div>
        {recurring && <p className="ui mt-3 text-sm text-ink-2">Time deposits are greyed out because they take a single placement. Set the monthly amount to ₱0 to compare them.</p>}

        <div className="mt-10 bg-paper p-4 sm:p-6">
          {series.length === 0 ? (
            <p className="ui p-8 text-center text-ink-2">Choose at least one option to compare.</p>
          ) : (
            <ComparisonChart series={series} contributed={reference} mode={mode} />
          )}
        </div>

        {(() => {
          type Row = { id: string; name: string; error?: string; cells: { h: string; v: ReactNode; cls?: string }[] }
          const gainCls = (g: { gte: (n: number) => boolean }) => `font-semibold ${g.gte(0) ? 'text-gain' : 'text-loss'}`
          const rows: Row[] = []
          if (showMp2 && m.ok) {
            rows.push({
              id: 'mp2',
              name: 'Pag-IBIG MP2',
              cells: [
                { h: 'Final amount', v: peso(m.value.maturityValue) },
                { h: "In today's pesos", v: peso(m.value.real.realEnding) },
                { h: 'Real gain or loss', v: pesoSigned(m.value.real.realGain), cls: gainCls(m.value.real.realGain) },
                { h: 'Tax', v: 'Tax-free' },
                { h: 'Access to money', v: `${mp2.program.maturityYears}-year term; early exit only for set reasons` },
                { h: 'Rate certainty', v: 'Declared yearly; not guaranteed' },
              ],
            })
          }
          for (const { p, r } of results) {
            if (p.kind === 'time-deposit' && recurring) continue
            rows.push(
              r.ok
                ? {
                    id: p.id,
                    name: `${p.bank} ${p.product}`,
                    cells: [
                      { h: 'Final amount', v: peso(r.value.finalBalance) },
                      { h: "In today's pesos", v: peso(r.value.real.realEnding) },
                      { h: 'Real gain or loss', v: pesoSigned(r.value.real.realGain), cls: gainCls(r.value.real.realGain) },
                      { h: 'Tax', v: `${banks.tax.ratePct}% withheld` },
                      { h: 'Access to money', v: p.liquidity },
                      { h: 'Rate certainty', v: `Bank can change it anytime${p.promo ? '; promo excluded' : ''}` },
                    ],
                  }
                : { id: p.id, name: `${p.bank} ${p.product}`, error: r.error, cells: [] },
            )
          }
          if (!rows.length) return null
          const heads = ['Final amount', "In today's pesos", 'Real gain or loss', 'Tax', 'Access to money', 'Rate certainty']
          const swatch = (id: string) => <span aria-hidden="true" className="mr-2 inline-block h-3 w-3 shrink-0 rounded-full" style={{ background: colorOf(id) }} />
          return (
            <>
              <table className="ui mt-10 hidden w-full border-collapse text-left text-[0.9375rem] lg:table">
                <thead>
                  <tr className="bg-ground">
                    <th scope="col" className="p-3 font-semibold">
                      Option
                    </th>
                    {heads.map((h) => (
                      <th key={h} scope="col" className="p-3 font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="tabular">
                  {rows.map((row) => (
                    <tr key={row.id} className="align-top odd:bg-paper even:bg-ground">
                      <th scope="row" className="p-3 font-medium">
                        {swatch(row.id)}
                        {row.name}
                      </th>
                      {row.error ? (
                        <td colSpan={6} className="p-3 text-loss">
                          {row.error}
                        </td>
                      ) : (
                        row.cells.map((c) => (
                          <td key={c.h} className={`p-3 ${c.cls ?? ''}`}>
                            {c.v}
                          </td>
                        ))
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              <ul className="ui m-0 mt-10 grid list-none gap-2 p-0 sm:grid-cols-2 lg:hidden">
                {rows.map((row) => (
                  <li key={row.id} className="bg-paper p-5">
                    <h3 className="flex items-center text-[1.0625rem] font-semibold tracking-normal">
                      {swatch(row.id)}
                      {row.name}
                    </h3>
                    {row.error ? (
                      <p className="mt-2 text-loss">{row.error}</p>
                    ) : (
                      <dl className="m-0 mt-3 grid grid-cols-[minmax(0,9rem)_1fr] gap-x-4 gap-y-2.5 text-[0.9375rem]">
                        {row.cells.map((c) => (
                          <div key={c.h} className="contents">
                            <dt className="text-muted">{c.h}</dt>
                            <dd className={`m-0 tabular ${c.cls ?? ''}`}>{c.v}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )
        })()}
      </div>
    </section>
  )
}

/**
 * Cumulative deposits per year-end (monthly deposits at the start of each
 * month), in pesos or valued in today's pesos at the time each was made.
 */
function contributionsByYear(s: ScenarioState, mode: 'real' | 'nominal'): number[] {
  const months = s.scenario.years * 12
  const factor = 1 + s.inflation.rate / 100
  const out = [0]
  let total = 0
  for (let t = 0; t < months; t++) {
    const dep = (t === 0 ? s.scenario.initial : 0) + s.scenario.monthly
    total += mode === 'real' ? dep / Math.pow(factor, t / 12) : dep
    if ((t + 1) % 12 === 0) out.push(total)
  }
  return out
}
