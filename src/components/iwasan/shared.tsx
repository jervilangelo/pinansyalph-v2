import type { ReactNode } from 'react'
import { IWASAN_SOURCES } from '../../data/iwasanSources'
import { t, tv } from '../../i18n'

/** A numbered citation that jumps to the source list and names the source on hover. */
export function Cite({ id }: { id: string }) {
  const i = IWASAN_SOURCES.findIndex((s) => s.id === id)
  if (i < 0) throw new Error(`Unknown source ${id}`)
  const s = IWASAN_SOURCES[i]
  return (
    <sup className="ui ml-0.5 text-[0.75em] font-semibold">
      <a href={`#src-${id}`} title={`${s.org}: ${s.title}`} className="text-accent no-underline hover:underline" aria-label={t("Source {v0}: {title}", { v0: i + 1, title: s.title })}>
        [{i + 1}]
      </a>
    </sup>
  )
}

/** A horizontal bar for comparisons; width is a share of `max`. */
export function Bar({
  label,
  value,
  max,
  display,
  tone = 'alarm',
  testId,
}: {
  label: ReactNode
  value: number
  max: number
  display: string
  tone?: 'alarm' | 'accent' | 'gain' | 'muted'
  testId?: string
}) {
  const fill = tone === 'alarm' ? 'bg-alarm' : tone === 'accent' ? 'bg-accent' : tone === 'gain' ? 'bg-gain' : 'bg-surface-2'
  const w = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0
  return (
    <div className="ui">
      <div className="flex items-baseline justify-between gap-3 text-[0.9375rem]">
        <span className="text-ink-2">{tv(label)}</span>
        <span className="tabular font-semibold" data-testid={testId}>
          {display}
        </span>
      </div>
      <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-surface">
        <div className={`h-full rounded-full transition-[width] duration-500 ease-[var(--ease-out-quint)] ${fill}`} style={{ width: `${w}%` }} />
      </div>
    </div>
  )
}
