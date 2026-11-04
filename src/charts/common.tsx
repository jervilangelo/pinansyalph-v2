import type { ReactNode } from 'react'
import { useReducedMotion } from 'motion/react'
import type { InflationSeriesKey } from '../types/data'

/** Fixed categorical order (validated palette). Colour follows the entity, never its rank. */
export const SERIES = ['var(--color-s1)', 'var(--color-s2)', 'var(--color-s3)', 'var(--color-s4)', 'var(--color-s5)', 'var(--color-s6)', 'var(--color-s7)', 'var(--color-s8)']
/** MP2 is the reference option in comparisons, drawn in ink so it never competes with a bank's slot. */
export const MP2_COLOR = '#151514'
export const INFLATION_SERIES: { key: InflationSeriesKey; label: string; color: string }[] = [
  { key: 'headline', label: 'Headline', color: 'var(--color-s1)' },
  { key: 'core', label: 'Core', color: 'var(--color-s2)' },
  { key: 'food', label: 'Food', color: 'var(--color-s3)' },
  { key: 'transport', label: 'Transport', color: 'var(--color-s4)' },
]

export const NEUTRAL = '#8a877f'
export const GRID = '#dcd9d0'
export const AXIS = '#5c5a54'

export const axisTick = { fill: AXIS, fontSize: 13, fontFamily: 'Instrument Sans, system-ui, sans-serif' }

export function useChartAnimation() {
  const reduce = useReducedMotion()
  return { isAnimationActive: !reduce, animationDuration: 900, animationEasing: 'ease-out' as const }
}

/** Shared tooltip shell; text stays in ink, a swatch carries identity. */
export function TooltipCard({ title, rows }: { title: ReactNode; rows: { color: string; label: string; value: string; dashed?: boolean }[] }) {
  return (
    <div className="ui min-w-[200px] bg-ink px-3.5 py-3 text-[0.875rem] text-ground shadow-lg">
      <p className="mb-1.5 font-semibold">{title}</p>
      <ul className="m-0 grid list-none gap-1 p-0">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2">
              <span aria-hidden="true" className="inline-block h-0 w-4" style={{ borderTop: `3px ${r.dashed ? 'dashed' : 'solid'} ${r.color}` }} />
              {r.label}
            </span>
            <span className="tabular font-medium">{r.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Legend({ items }: { items: { color: string; label: string; dashed?: boolean }[] }) {
  return (
    <ul className="ui m-0 flex list-none flex-wrap gap-x-5 gap-y-2 p-0 text-[0.9375rem]">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-2">
          <span aria-hidden="true" className="inline-block h-0 w-5" style={{ borderTop: `3px ${i.dashed ? 'dashed' : 'solid'} ${i.color}` }} />
          {i.label}
        </li>
      ))}
    </ul>
  )
}

/** Compact peso ticks: ₱1.2M, ₱350K */
export function pesoTick(v: number): string {
  const a = Math.abs(v)
  const sign = v < 0 ? '−' : ''
  if (a >= 1e9) return `${sign}₱${(a / 1e9).toFixed(a >= 1e10 ? 0 : 1)}B`
  if (a >= 1e6) return `${sign}₱${(a / 1e6).toFixed(a >= 1e7 ? 0 : 1)}M`
  if (a >= 1e3) return `${sign}₱${Math.round(a / 1e3)}K`
  return `${sign}₱${Math.round(a)}`
}

export function ChartEmpty({ children }: { children: ReactNode }) {
  return <div className="ui flex h-full min-h-[240px] items-center justify-center bg-surface p-6 text-center text-ink-2">{children}</div>
}
