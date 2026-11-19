import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { FuelAdjustment, FuelKey } from '../types/data'
import { dateLabel, perLiter } from '../utils/format'
import { AXIS, GRID, TooltipCard, axisTick, useChartAnimation } from './common'
import { tx } from '../i18n/react'
import { t, tv } from '../i18n'

const UP = 'var(--color-loss)'
const DOWN = 'var(--color-gain)'

/**
 * Graph D — fuel price movements. Two charts, never a dual axis:
 * weekly adjustment (₱/L, bars) and DOE's year-to-date net change (₱/L, line).
 */
export default function FuelChart({ adjustments, fuel, label }: { adjustments: FuelAdjustment[]; fuel: FuelKey; label: string }) {
  const anim = useChartAnimation()
  const data = adjustments.map((a) => ({
    date: a.effectiveDate,
    mid: Math.round(((a[fuel].min + a[fuel].max) / 2) * 100) / 100,
    min: a[fuel].min,
    max: a[fuel].max,
    ytd: a.ytdNet ? a.ytdNet[fuel] : null,
  }))

  return (
    <div className="grid gap-10">
      <figure className="m-0">
        <figcaption className="ui mb-3 text-[0.9375rem] font-semibold">{tx("{label}: weekly pump price adjustment, ₱ per liter", { label: (tv(label)), })}</figcaption>
        <div className="h-[clamp(240px,30vw,340px)]" role="img" aria-label={t("Bar chart of weekly {v0} price adjustments from {date} to {date2}. Red bars are increases, green bars are rollbacks.", { v0: label.toLowerCase(), date: dateLabel(data[0].date), date2: dateLabel(data[data.length - 1].date) })}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }} barCategoryGap="18%">
              <CartesianGrid stroke={GRID} vertical={false} />
              <ReferenceLine y={0} stroke={AXIS} />
              <XAxis dataKey="date" tick={axisTick} tickLine={false} axisLine={false} tickFormatter={(d) => dateLabel(d, false)} interval="preserveStartEnd" minTickGap={20} />
              <YAxis tick={axisTick} tickLine={false} axisLine={false} tickFormatter={(v) => `₱${v}`} width={52} />
              <Tooltip
                cursor={{ fill: 'var(--chart-cursor)' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0].payload as (typeof data)[number]
                  return (
                    <TooltipCard
                      title={t("Week of {date}", { date: dateLabel(d.date) })}
                      rows={[
                        { color: d.mid >= 0 ? UP : DOWN, label: d.mid >= 0 ? t('Increase') : t('Rollback'), value: perLiter(d.min, d.max) },
                        ...(d.ytd != null ? [{ color: 'var(--color-placeholder)', label: t("Net since January"), value: perLiter(d.ytd, d.ytd) }] : []),
                      ]}
                    />
                  )
                }}
              />
              <Bar dataKey="mid" radius={[3, 3, 3, 3]} {...anim}>
                {data.map((d) => (
                  <Cell key={d.date} fill={d.mid >= 0 ? UP : DOWN} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="ui mt-2 text-sm text-muted">{t("Bars show the middle of DOE's reported range across oil companies. Red is an increase, green a rollback.")}</p>
      </figure>

      <figure className="m-0">
        <figcaption className="ui mb-3 text-[0.9375rem] font-semibold">{tx("{label}: net change since the start of the year, ₱ per liter", { label: (tv(label)), })}</figcaption>
        <div className="h-[clamp(200px,24vw,280px)]" role="img" aria-label={t("Line chart of the year-to-date net change in {v0} prices reported by DOE.", { v0: label.toLowerCase() })}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="date" tick={axisTick} tickLine={false} axisLine={false} tickFormatter={(d) => dateLabel(d, false)} interval="preserveStartEnd" minTickGap={20} />
              <YAxis tick={axisTick} tickLine={false} axisLine={false} tickFormatter={(v) => `₱${v}`} width={52} domain={['auto', 'auto']} />
              <Tooltip
                cursor={{ stroke: AXIS, strokeDasharray: '3 3' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0].payload as (typeof data)[number]
                  return <TooltipCard title={t("As of {date}", { date: dateLabel(d.date) })} rows={[{ color: 'var(--color-ink)', label: t("Net since January"), value: d.ytd == null ? 'not stated' : perLiter(d.ytd, d.ytd) }]} />
                }}
              />
              <Line type="monotone" dataKey="ytd" stroke="var(--color-ink)" strokeWidth={2.5} dot={{ r: 3, fill: 'var(--color-ink)' }} activeDot={{ r: 5 }} connectNulls {...anim} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </figure>
    </div>
  )
}
