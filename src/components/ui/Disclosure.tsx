import { AnimatePresence } from 'motion/react'
import { ChevronDown } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { collapse, motion, useReducedMotion } from './motion'
import { tv } from '../../i18n'

/**
 * Progressive disclosure: a labelled row that opens to reveal detail.
 * Used for breakdowns, methodology, tables and secondary charts, so a page
 * shows its answer first and its working on request.
 */
export function Disclosure({
  title,
  summary,
  children,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  tone = 'paper',
  size = 'md',
  id,
  headingLevel,
}: {
  title: ReactNode
  /** Short value or note shown on the closed row, e.g. a peso total. */
  summary?: ReactNode
  children: ReactNode
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  tone?: 'paper' | 'ground' | 'surface' | 'plain'
  size?: 'sm' | 'md' | 'lg'
  id?: string
  /** Wrap the trigger in a heading when the disclosure names a section. */
  headingLevel?: 2 | 3 | 4
}) {
  const [inner, setInner] = useState(defaultOpen)
  const open = controlledOpen ?? inner
  const setOpen = (v: boolean) => {
    if (controlledOpen === undefined) setInner(v)
    onOpenChange?.(v)
  }
  const reduce = useReducedMotion()
  const auto = useId()
  const panelId = id ?? `disc-${auto.replace(/:/g, '')}`
  const bg = tone === 'paper' ? 'bg-paper' : tone === 'ground' ? 'bg-ground' : tone === 'surface' ? 'bg-surface' : ''
  const pad = size === 'lg' ? 'px-5 py-5 sm:px-8 sm:py-6' : size === 'sm' ? 'px-4 py-3' : 'px-5 py-4 sm:px-6'
  const titleCls = size === 'lg' ? 'serif text-[clamp(1.25rem,1.1rem+0.6vw,1.625rem)] leading-tight tracking-[-0.015em]' : size === 'sm' ? 'text-[0.9375rem] font-semibold' : 'text-[1.0625rem] font-semibold'

  const trigger = (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={panelId}
      onClick={() => setOpen(!open)}
      className={`ui group flex w-full cursor-pointer items-center gap-4 rounded-[inherit] border-0 bg-transparent text-left text-ink transition-colors hover:bg-ink/[0.035] ${pad}`}
    >
      <span className={`min-w-0 flex-1 ${titleCls}`}>{tv(title)}</span>
      {summary != null && <span className="tabular min-w-0 max-w-[48%] text-right text-[0.9375rem] leading-snug font-medium text-ink-2">{summary}</span>}
      <span aria-hidden="true" className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${open ? 'bg-ink text-ground' : 'bg-surface text-ink group-hover:bg-surface-2'}`}>
        <ChevronDown size={18} strokeWidth={2} className={`transition-transform duration-300 ease-[var(--ease-out-quint)] ${open ? 'rotate-180' : ''}`} />
      </span>
    </button>
  )

  const H = headingLevel ? (`h${headingLevel}` as const) : null
  return (
    <div className={`${bg} min-w-0 rounded-[22px]`}>
      {H ? <H className="m-0 font-sans text-base tracking-normal">{trigger}</H> : trigger}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            key="panel"
            {...(reduce ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } } : collapse)}
            className="overflow-hidden"
          >
            <div className={size === 'lg' ? 'px-5 pb-7 sm:px-8' : size === 'sm' ? 'px-4 pb-4' : 'px-5 pb-6 sm:px-6'}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
