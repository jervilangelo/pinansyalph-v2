import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { peso } from '../utils/format'
import { AXIS, GRID, Legend, NEUTRAL, TooltipCard, axisTick, pesoTick, useChartAnimation } from './common'

export interface ComparisonSeries {
  id: string
  label: string
  color: string
  /** value at year 0..N */
  points: number[]
}

/** Graph B — products side by side, same contributions, one peso axis. */
export default function ComparisonChart({ series, contributed, mode }: { series: ComparisonSeries[]; contributed: number[]; mode: 'real' | 'nominal' }) {
  const anim = useChartAnimation()
  const data = contributed.map((c, year) => {
    const row: Record<string, number> = { year, contributed: c }
    for (const s of series) row[s.id] = s.points[year]
    return row
  })
  const legend = [...series.map((s) => ({ color: s.color, label: s.label })), { color: NEUTRAL, label: mode === 'real' ? "Contributions in today's pesos" : 'Total you put in', dashed: true }]

  return (
    <figure className="m-0">
      <div className="mb-4">
        <Legend items={legend} />
      </div>
      <div className="h-[clamp(300px,40vw,460px)]" role="img" aria-label={`Line chart comparing ${series.map((s) => s.label).join(', ')} over ${contributed.length - 1} years, ${mode === 'real' ? "in today's pesos" : 'in pesos'}.`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="year" tick={axisTick} tickLine={false} axisLine={{ stroke: AXIS }} tickFormatter={(v) => (v === 0 ? 'Start' : `Yr ${v}`)} interval="preserveStartEnd" minTickGap={16} />
            <YAxis tick={axisTick} tickLine={false} axisLine={false} tickFormatter={pesoTick} width={64} domain={['auto', 'auto']} />
            <Tooltip
              cursor={{ stroke: AXIS, strokeDasharray: '3 3' }}
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <TooltipCard
                    title={label === 0 ? 'Start' : `End of year ${label}`}
                    rows={[
                      ...series
                        .map((s) => ({ color: s.color, label: s.label, value: Number(payload[0].payload[s.id]) }))
                        .sort((a, b) => b.value - a.value)
                        .map((r) => ({ ...r, value: peso(r.value) })),
                      { color: NEUTRAL, dashed: true, label: 'Put in', value: peso(Number(payload[0].payload.contributed)) },
                    ]}
                  />
                ) : null
              }
            />
            <Line type="monotone" dataKey="contributed" stroke={NEUTRAL} strokeWidth={2} strokeDasharray="6 5" dot={false} {...anim} />
            {series.map((s) => (
              <Line key={s.id} type="monotone" dataKey={s.id} name={s.label} stroke={s.color} strokeWidth={2.5} dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: '#fbfaf7' }} {...anim} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </figure>
  )
}
