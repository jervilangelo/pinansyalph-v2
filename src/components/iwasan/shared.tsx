import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { IWASAN_SOURCES } from '../../data/iwasanSources'
import { Reveal } from '../ui/motion'

/** A numbered citation that jumps to the source list and names the source on hover. */
export function Cite({ id }: { id: string }) {
  const i = IWASAN_SOURCES.findIndex((s) => s.id === id)
  if (i < 0) throw new Error(`Unknown source ${id}`)
  const s = IWASAN_SOURCES[i]
  return (
    <sup className="ui ml-0.5 text-[0.75em] font-semibold">
      <a href={`#src-${id}`} title={`${s.org}: ${s.title}`} className="text-accent no-underline hover:underline" aria-label={`Source ${i + 1}: ${s.title}`}>
        [{i + 1}]
      </a>
    </sup>
  )
}

/** Section opening: a red icon tile, the heading and one plain sentence. */
export function SectionHead({ id, icon: Icon, title, lede, tone = 'alarm' }: { id: string; icon: LucideIcon; title: string; lede: ReactNode; tone?: 'alarm' | 'gain' | 'accent' }) {
  const tile = tone === 'alarm' ? 'bg-alarm text-white' : tone === 'gain' ? 'bg-gain text-white' : 'bg-accent text-white'
  return (
    <Reveal className="grid gap-5 lg:grid-cols-12 lg:items-end">
      <div className="flex items-start gap-4 lg:col-span-7">
        <span aria-hidden="true" className={`mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] sm:h-14 sm:w-14 ${tile}`}>
          <Icon size={26} strokeWidth={2.1} />
        </span>
        <h2 id={`${id}-title`} className="text-step-head">
          {title}
        </h2>
      </div>
      <div className="text-[1.0625rem] leading-relaxed text-ink-2 lg:col-span-5 lg:pb-2">{lede}</div>
    </Reveal>
  )
}

/** Terms and what they mean, two columns on wide screens. */
export function Concepts({ items }: { items: { term: string; body: ReactNode }[] }) {
  return (
    <dl className="m-0 grid gap-x-10 gap-y-6 sm:grid-cols-2">
      {items.map((c) => (
        <div key={c.term}>
          <dt className="serif text-[1.25rem] leading-tight tracking-[-0.01em]">{c.term}</dt>
          <dd className="m-0 mt-1.5 text-[1rem] leading-relaxed text-ink-2">{c.body}</dd>
        </div>
      ))}
    </dl>
  )
}

/** A red notice for the one thing to remember. */
export function Warning({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <div className="rounded-[22px] bg-alarm-soft p-5 text-alarm-deep sm:p-6" role="note">
      {title && <p className="ui text-[0.9375rem] font-bold">{title}</p>}
      <div className={`text-[1rem] leading-relaxed ${title ? 'mt-1.5' : ''}`}>{children}</div>
    </div>
  )
}

/** What the rules say: official, so in the site's information blue. */
export function RuleBox({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-[22px] bg-accent-soft p-5 sm:p-6">
      <p className="ui text-[0.9375rem] font-bold text-accent">{title}</p>
      <div className="mt-2 grid gap-2 text-[1rem] leading-relaxed text-ink">{children}</div>
    </div>
  )
}

/** A healthier alternative, in green. */
export function Better({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <div className="rounded-[22px] bg-gain-soft p-5 sm:p-6">
      {title && <p className="ui text-[0.9375rem] font-bold text-gain">{title}</p>}
      <div className={`text-[1rem] leading-relaxed text-ink ${title ? 'mt-1.5' : ''}`}>{children}</div>
    </div>
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
        <span className="text-ink-2">{label}</span>
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
