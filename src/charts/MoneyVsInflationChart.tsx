import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Mp2Result } from '../calculators/mp2'
import { peso } from '../utils/format'
import { AXIS, GRID, Legend, NEUTRAL, SERIES, TooltipCard, axisTick, pesoTick, useChartAnimation } from './common'

/**
 * Graph A — Your money vs inflation.
 * Three lines on one peso axis: what you put in, what you would have,
 * and what that is worth in today's pesos.
 */
export default function MoneyVsInflationChart({ result }: { result: Mp2Result }) {
  const anim = useChartAnimation()
  const data = [
    { year: 0, contributed: 0, nominal: 0, real: 0, realContributed: 0 },
    ...result.rows.map((r) => ({
      year: r.year,
      contributed: r.contributed.toNumber(),
      nominal: r.nominalTotal.toNumber(),
      real: r.realTotal.toNumber(),
      realContributed: r.realContributed.toNumber(),
    })),
  ]
  const series = [
    { key: 'nominal', label: 'Projected balance', color: SERIES[0] },
    { key: 'real', label: "Worth in today's pesos", color: SERIES[1] },
    { key: 'contributed', label: 'Total you put in', color: NEUTRAL, dashed: true },
    { key: 'realContributed', label: "What you put in, in today's pesos", color: SERIES[1], dashed: true },
  ] as const

  return (
    <figure className="m-0">
      <div className="mb-4">
        <Legend items={series.map((s) => ({ color: s.color, label: s.label, dashed: 'dashed' in s }))} />
        <p className="ui mt-2 text-[0.875rem] text-ink-2">
          Compare the two orange lines: the solid one is what you end up with in today's pesos, the dashed one is what your
          contributions were worth when you made them. The gap at the end is your real gain or loss.
        </p>
      </div>
      <div className="h-[clamp(280px,42vw,460px)]" role="img" aria-label={`Line chart: projected balance, value in today's pesos, and total contributed over ${result.rows.length} years.`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="year" tick={axisTick} tickLine={false} axisLine={{ stroke: AXIS }} tickFormatter={(v) => (v === 0 ? 'Start' : `Yr ${v}`)} interval="preserveStartEnd" minTickGap={16} />
            <YAxis tick={axisTick} tickLine={false} axisLine={false} tickFormatter={pesoTick} width={64} />
            <Tooltip
              cursor={{ stroke: AXIS, strokeDasharray: '3 3' }}
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <TooltipCard
                    title={label === 0 ? 'Start' : `End of year ${label}`}
                    rows={series.map((s) => ({ color: s.color, dashed: 'dashed' in s, label: s.label, value: peso(Number(payload[0].payload[s.key])) }))}
                  />
                ) : null
              }
            />
            {series.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={'dashed' in s ? 2 : 2.5}
                strokeDasharray={'dashed' in s ? '6 5' : undefined}
                dot={false}
                activeDot={{ r: 5, strokeWidth: 2, stroke: '#fbfaf7' }}
                {...anim}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </figure>
  )
}
