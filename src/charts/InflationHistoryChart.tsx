import { CartesianGrid, Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { InflationSeriesKey, MonthlyObservation } from '../types/data'
import { monthLabel, monthTick, pct } from '../utils/format'
import { AXIS, GRID, INFLATION_SERIES, Legend, TooltipCard, axisTick, useChartAnimation } from './common'


/** Graph C — Philippine inflation history (year-on-year, monthly). */
export default function InflationHistoryChart({ series, visible, range }: { series: Record<InflationSeriesKey, MonthlyObservation[]>; visible: InflationSeriesKey[]; range: number }) {
  const anim = useChartAnimation()
  const periods = series.headline.slice(-range).map((o) => o.period)
  const byKey = Object.fromEntries(INFLATION_SERIES.map((s) => [s.key, new Map(series[s.key].map((o) => [o.period, o.value]))]))
  const data = periods.map((p) => {
    const row: Record<string, string | number | null> = { period: p }
    for (const s of INFLATION_SERIES) row[s.key] = byKey[s.key].get(p) ?? null
    return row
  })
  const shown = INFLATION_SERIES.filter((s) => visible.includes(s.key))

  return (
    <figure className="m-0">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Legend items={[...shown.map((s) => ({ color: s.color, label: s.label })), { color: '#c9d8ea', label: 'BSP target, 2–4%' }]} />
      </div>
      <div className="h-[clamp(300px,38vw,440px)]" role="img" aria-label={`Line chart of Philippine year-on-year inflation, ${monthLabel(periods[0])} to ${monthLabel(periods[periods.length - 1])}.`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <ReferenceArea y1={2} y2={4} fill="#c9d8ea" fillOpacity={0.55} stroke="none" ifOverflow="extendDomain" />
            <ReferenceLine y={0} stroke={AXIS} />
            <XAxis dataKey="period" tick={axisTick} tickLine={false} axisLine={false} tickFormatter={monthTick} interval="preserveStartEnd" minTickGap={28} />
            <YAxis tick={axisTick} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} width={48} />
            <Tooltip
              cursor={{ stroke: AXIS, strokeDasharray: '3 3' }}
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <TooltipCard
                    title={monthLabel(String(label))}
                    rows={shown.map((s) => {
                      const v = payload[0].payload[s.key]
                      return { color: s.color, label: s.label, value: v == null ? 'n/a' : pct(Number(v)) }
                    })}
                  />
                ) : null
              }
            />
            {shown.map((s) => (
              <Line key={s.key} type="monotone" dataKey={s.key} stroke={s.color} strokeWidth={s.key === 'headline' ? 2.75 : 2} dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: '#fbfaf7' }} connectNulls={false} {...anim} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </figure>
  )
}
