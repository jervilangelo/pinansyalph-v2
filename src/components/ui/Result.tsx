import type { FormEvent, ReactNode } from 'react'
import { AnimatedNumber } from './motion'
import { tv } from '../../i18n'

/**
 * The answer block every tool leads with: one label, one large peso figure,
 * one plain sentence. Brand blue so the answer is the first thing seen.
 */
export function ResultHero({
  label,
  value,
  format,
  caption,
  aside,
  tone = 'accent',
  testId,
  children,
}: {
  label: ReactNode
  value: number
  format: (n: number) => string
  caption?: ReactNode
  aside?: ReactNode
  /** soft: a quiet white panel, for an answer that is not yet meaningful. */
  tone?: 'accent' | 'loss' | 'soft'
  testId?: string
  children?: ReactNode
}) {
  const soft = tone === 'soft'
  const bg = tone === 'loss' ? 'bg-loss text-accent-ink on-accent' : soft ? 'bg-paper text-ink' : 'bg-accent text-accent-ink on-accent'
  const sub = soft ? 'text-muted' : 'text-white/85'
  return (
    <div className={`relative overflow-hidden rounded-[28px] ${bg} p-6 transition-colors duration-500 sm:p-8`} aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className={`ui flex items-center gap-2.5 text-[0.9375rem] font-semibold ${soft ? 'text-ink-2' : 'text-white/90'}`}>
          <SunMark />
          {tv(label)}
        </p>
        {aside}
      </div>
      <p className="figure mt-4 text-[clamp(2.75rem,2rem+3.4vw,4.5rem)] leading-[0.95]">
        <AnimatedNumber value={value} format={format} testId={testId} />
      </p>
      {caption && <div className={`ui mt-4 max-w-[46ch] text-[0.9375rem] leading-relaxed ${sub}`}>{tv(caption)}</div>}
      {children}
    </div>
  )
}

/** The sun from the logo, as a small marker next to a result label. Decorative. */
export function SunMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 76 38" width="16" height="8" aria-hidden="true" focusable="false" className={className}>
      <path d="M0 38A38 38 0 0 1 76 38Z" fill="#EDA100" />
    </svg>
  )
}

/** A secondary figure: label above, value below. */
export function Stat({ label, value, note, tone, testId }: { label: ReactNode; value: ReactNode; note?: ReactNode; tone?: 'gain' | 'loss'; testId?: string }) {
  const color = tone === 'gain' ? 'text-gain' : tone === 'loss' ? 'text-loss' : ''
  return (
    <div className="flex flex-col gap-1">
      <dt className="ui text-[0.875rem] leading-snug font-medium text-muted">{tv(label)}</dt>
      <dd className={`figure m-0 text-[1.625rem] leading-tight ${color}`} data-testid={testId}>
        {value}
      </dd>
      {note && <p className="ui text-[0.8125rem] leading-snug text-muted">{tv(note)}</p>}
    </div>
  )
}

/** Tool page body: inputs on one side, the answer (sticky on desktop) on the other. */
export function CalcGrid({ inputs, result, className = '' }: { inputs: ReactNode; result: ReactNode; className?: string }) {
  return (
    <div className={`grid items-start gap-4 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:gap-6 ${className}`}>
      <div className="grid min-w-0 gap-4">{inputs}</div>
      <div className="grid min-w-0 gap-4 lg:sticky lg:top-[calc(var(--header-h)+20px)]">{result}</div>
    </div>
  )
}

/** A white panel with an optional heading. */
export function Panel({ title, intro, children, className = '', id, as: Tag = 'div' }: { title?: ReactNode; intro?: ReactNode; children: ReactNode; className?: string; id?: string; as?: 'div' | 'section' | 'form' }) {
  return (
    <Tag className={`card p-5 sm:p-7 ${className}`} id={id} {...(Tag === 'form' ? { onSubmit: (e: FormEvent) => e.preventDefault() } : {})}>
      {title && <h2 className="text-[1.5rem] leading-tight">{tv(title)}</h2>}
      {intro && <p className="ui mt-2 text-[0.9375rem] leading-relaxed text-muted">{intro}</p>}
      <div className={title || intro ? 'mt-6' : ''}>{children}</div>
    </Tag>
  )
}
