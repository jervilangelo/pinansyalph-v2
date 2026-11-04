import { useState } from 'react'
import { Bar, BarChart, Cell, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { peso } from '../utils/format'
import { AXIS, TooltipCard, axisTick, pesoTick, useChartAnimation } from './common'

export interface Slice {
  key: string
  label: string
  value: number
  color: string
}

const pctOf = (v: number, total: number) => (total > 0 ? `${((v / total) * 100).toFixed(1)}%` : '—')

/** Chart 1 — salary breakdown donut, with a legend that doubles as a table. */
export function SalaryDonut({ slices, total, shortfall, centerLabel, centerValue }: { slices: Slice[]; total: number; shortfall: number; centerLabel: string; centerValue: string }) {
  const anim = useChartAnimation()
  const [active, setActive] = useState<string | null>(null)
  const sum = slices.reduce((s, x) => s + x.value, 0)
  return (
    <figure className="m-0 grid items-center gap-6 sm:grid-cols-[minmax(0,240px)_1fr]">
      <div className="relative mx-auto aspect-square w-full max-w-[240px]" role="img" aria-label={`Donut chart of where your gross pay goes: ${slices.map((s) => `${s.label} ${peso(s.value)}`).join(', ')}.`}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="label"
              innerRadius="64%"
              outerRadius="100%"
              paddingAngle={slices.length > 1 ? 1.2 : 0}
              stroke="#fbfbfa"
              strokeWidth={2}
              onMouseEnter={(_, i) => setActive(slices[i]?.key ?? null)}
              onMouseLeave={() => setActive(null)}
              {...anim}
            >
              {slices.map((s) => (
                <Cell key={s.key} fill={s.color} opacity={active && active !== s.key ? 0.35 : 1} />
              ))}
            </Pie>
            <Tooltip content={({ active: a, payload }) => (a && payload?.length ? <TooltipCard title={String(payload[0].name)} rows={[{ color: String(payload[0].payload.color), label: pctOf(Number(payload[0].value), sum), value: peso(Number(payload[0].value)) }]} /> : null)} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="ui text-[0.8125rem] text-ink-2">{centerLabel}</span>
          <span className="tabular text-[1.375rem] leading-tight font-medium">{centerValue}</span>
        </div>
      </div>
      <ul className="ui m-0 grid list-none gap-1.5 p-0 text-[0.9375rem]">
        {slices.map((s) => (
          <li
            key={s.key}
            className={`grid grid-cols-[auto_1fr_auto] items-center gap-3 px-2 py-1 transition-colors ${active === s.key ? 'bg-surface' : ''}`}
            onMouseEnter={() => setActive(s.key)}
            onMouseLeave={() => setActive(null)}
          >
            <span aria-hidden="true" className="inline-block h-3 w-3 rounded-full" style={{ background: s.color }} />
            <span className="min-w-0">{s.label}</span>
            <span className="tabular text-right">
              {peso(s.value)} <span className="text-muted">· {pctOf(s.value, total)}</span>
            </span>
          </li>
        ))}
        {shortfall > 0 && (
          <li className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-2 py-1 text-loss">
            <span aria-hidden="true" className="inline-block h-3 w-3 rounded-full border-2 border-loss" />
            <span>Shortfall (spending above pay)</span>
            <span className="tabular text-right font-semibold">{peso(shortfall)}</span>
          </li>
        )}
      </ul>
    </figure>
  )
}

/** Chart 2 — where your money goes, biggest first. */
export function SpendingRanking({ rows }: { rows: Slice[] }) {
  const anim = useChartAnimation()
  if (!rows.length) return <p className="ui bg-surface p-6 text-center text-ink-2">Add expenses to see your biggest spending categories.</p>
  const height = 44 * rows.length + 16
  return (
    <div style={{ height }} role="img" aria-label={`Bar chart ranking spending: ${rows.map((r) => `${r.label} ${peso(r.value)}`).join(', ')}.`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 84, bottom: 0, left: 0 }} barCategoryGap="22%">
          <XAxis type="number" hide domain={[0, 'dataMax']} />
          <YAxis type="category" dataKey="label" tick={axisTick} tickLine={false} axisLine={false} width={150} />
          <Tooltip cursor={{ fill: 'rgba(21,21,20,0.05)' }} content={({ active, payload }) => (active && payload?.length ? <TooltipCard title={String(payload[0].payload.label)} rows={[{ color: String(payload[0].payload.color), label: 'Per month', value: peso(Number(payload[0].value)) }]} /> : null)} />
          <Bar dataKey="value" radius={[0, 3, 3, 0]} label={{ position: 'right', formatter: (v: unknown) => peso(Number(v)), fill: AXIS, fontSize: 13, fontFamily: 'Instrument Sans, system-ui, sans-serif' }} {...anim}>
            {rows.map((r) => (
              <Cell key={r.key} fill={r.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Chart 3 — gross vs take-home vs spending vs what is left. */
export function SalaryVsSpending({ rows }: { rows: Slice[] }) {
  const anim = useChartAnimation()
  return (
    <div className="h-[260px]" role="img" aria-label={`Bar chart: ${rows.map((r) => `${r.label} ${peso(r.value)}`).join(', ')}.`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 24, right: 8, bottom: 0, left: 0 }} barCategoryGap="28%">
          <XAxis dataKey="label" tick={{ ...axisTick, fontSize: 12 }} tickLine={false} axisLine={{ stroke: AXIS }} interval={0} />
          <YAxis tick={axisTick} tickLine={false} axisLine={false} tickFormatter={pesoTick} width={56} />
          <ReferenceLine y={0} stroke={AXIS} />
          <Tooltip cursor={{ fill: 'rgba(21,21,20,0.05)' }} content={({ active, payload }) => (active && payload?.length ? <TooltipCard title={String(payload[0].payload.label)} rows={[{ color: String(payload[0].payload.color), label: 'Per month', value: peso(Number(payload[0].value)) }]} /> : null)} />
          <Bar dataKey="value" radius={[3, 3, 0, 0]} label={{ position: 'top', formatter: (v: unknown) => peso(Number(v)), fill: AXIS, fontSize: 12, fontFamily: 'Instrument Sans, system-ui, sans-serif' }} {...anim}>
            {rows.map((r) => (
              <Cell key={r.key} fill={r.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function SalaryCharts(props: { donut: Parameters<typeof SalaryDonut>[0]; ranking: Slice[]; compare: Slice[] }) {
  return (
    <div className="grid gap-12">
      <section aria-labelledby="chart-breakdown">
        <h3 id="chart-breakdown" className="text-[1.375rem]">
          Saan napupunta ang bawat piso
        </h3>
        <p className="ui mt-1 mb-5 text-[0.9375rem] text-ink-2">Your gross pay, split into deductions, spending, savings and what is left.</p>
        <SalaryDonut {...props.donut} />
      </section>
      <div className="grid gap-12 xl:grid-cols-2">
        <section aria-labelledby="chart-ranking">
          <h3 id="chart-ranking" className="text-[1.375rem]">
            Biggest spending categories
          </h3>
          <p className="ui mt-1 mb-5 text-[0.9375rem] text-ink-2">Savings are not counted as spending.</p>
          <SpendingRanking rows={props.ranking} />
        </section>
        <section aria-labelledby="chart-compare">
          <h3 id="chart-compare" className="text-[1.375rem]">
            Sweldo vs gastos
          </h3>
          <p className="ui mt-1 mb-5 text-[0.9375rem] text-ink-2">Per month.</p>
          <SalaryVsSpending rows={props.compare} />
        </section>
      </div>
    </div>
  )
}
