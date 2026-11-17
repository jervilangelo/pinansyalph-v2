import { useId, useRef, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react'
import { SPRING, motion, useReducedMotion } from './motion'

export interface TabDef<T extends string> {
  id: T
  label: string
  /** Shorter label for phones. */
  short: string
}

/** Accessible tabs: arrow keys, Home and End move between tabs; the panel follows. */
export function Tabs<T extends string>({ tabs, value, onChange, label, children }: { tabs: TabDef<T>[]; value: T; onChange: (t: T) => void; label: string; children: ReactNode }) {
  const id = useId()
  const reduce = useReducedMotion()
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const onKey = (e: KeyboardEvent, i: number) => {
    const n = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : null
    if (n === null) return
    e.preventDefault()
    const next = (n + tabs.length) % tabs.length
    onChange(tabs[next].id)
    refs.current[next]?.focus()
  }
  return (
    <div className="min-w-0">
      <div
        role="tablist"
        aria-label={label}
        // More than four tabs wrap to two rows on phones; one row from tablet width.
        className={`ui relative grid gap-0.5 rounded-[18px] bg-surface p-1 ${tabs.length > 4 ? 'grid-cols-3 sm:grid-cols-[var(--tab-cols)]' : 'grid-cols-[var(--tab-cols)]'}`}
        style={{ '--tab-cols': `repeat(${tabs.length}, minmax(0, 1fr))` } as CSSProperties}
      >
        {tabs.map((t, i) => {
          const active = t.id === value
          return (
            <button
              key={t.id}
              ref={(el) => {
                refs.current[i] = el
              }}
              role="tab"
              type="button"
              id={`${id}-tab-${t.id}`}
              aria-selected={active}
              aria-controls={`${id}-panel`}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(t.id)}
              onKeyDown={(e) => onKey(e, i)}
              className="relative min-h-12 cursor-pointer rounded-[14px] border-0 bg-transparent px-1.5 text-[0.8125rem] leading-tight font-semibold text-ink-2 sm:px-2 sm:text-[0.9375rem]"
            >
              {active && <motion.span layoutId={`${id}-thumb`} aria-hidden="true" className="absolute inset-0 rounded-[14px] bg-paper shadow-[0_1px_2px_rgba(21,21,20,0.08),0_2px_8px_-2px_rgba(21,21,20,0.10)]" transition={reduce ? { duration: 0 } : SPRING} />}
              <span className={`relative ${active ? 'text-ink' : ''}`}>
                <span className="sm:hidden">{t.short}</span>
                <span className="hidden sm:inline">{t.label}</span>
              </span>
            </button>
          )
        })}
      </div>
      <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${value}`} className="mt-4 min-w-0" tabIndex={-1}>
        {children}
      </div>
    </div>
  )
}
