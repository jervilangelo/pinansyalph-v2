import { AnimatePresence } from 'motion/react'
import { Search, X } from 'lucide-react'
import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { DUR, EASE, motion, useReducedMotion } from './motion'

export interface ComboOption {
  id: string
  label: string
  hint?: ReactNode
}

/**
 * Searchable single choice (ARIA 1.2 combobox with a listbox popup).
 * Arrow keys move, Enter picks, Escape closes then clears, and the number
 * of matches is announced. The option list comes from `search`.
 */
export function Combobox({
  label,
  value,
  onChange,
  search,
  placeholder,
  hint,
  emptyText,
  footer,
}: {
  label: string
  value: ComboOption | null
  onChange: (o: ComboOption | null) => void
  search: (q: string) => ComboOption[]
  placeholder?: string
  hint?: ReactNode
  emptyText?: (q: string) => ReactNode
  /** Extra content at the bottom of the list, e.g. a "not listed" choice. */
  footer?: (close: () => void) => ReactNode
}) {
  const id = useId()
  const listId = `${id}-list`
  const reduce = useReducedMotion()
  const input = useRef<HTMLInputElement>(null)
  const [text, setText] = useState(value?.label ?? '')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const results = open ? search(text) : []

  const choose = (o: ComboOption) => {
    onChange(o)
    setText(o.label)
    setOpen(false)
  }
  const close = () => setOpen(false)

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open) setOpen(true)
      setActive((a) => Math.min(a + 1, Math.max(results.length - 1, 0)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter') {
      if (open && results[active]) {
        e.preventDefault()
        choose(results[active])
      }
    } else if (e.key === 'Escape') {
      if (open) setOpen(false)
      else {
        setText('')
        onChange(null)
      }
    }
  }

  return (
    <div className="ui relative">
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <div className="relative">
        <Search aria-hidden="true" size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted" />
        <input
          ref={input}
          id={id}
          role="combobox"
          aria-expanded={open && text.trim().length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && results[active] ? `${id}-opt-${results[active].id}` : undefined}
          aria-describedby={hint ? `${id}-hint` : undefined}
          autoComplete="off"
          spellCheck={false}
          className="field-input pr-12 pl-11"
          placeholder={placeholder}
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setActive(0)
            setOpen(true)
            if (value && e.target.value !== value.label) onChange(null)
          }}
          onFocus={() => text && !value && setOpen(true)}
          onBlur={() => window.setTimeout(close, 120)}
          onKeyDown={onKey}
        />
        {text && (
          <button
            type="button"
            onClick={() => {
              setText('')
              onChange(null)
              input.current?.focus()
            }}
            className="absolute top-1/2 right-2 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-muted transition-colors hover:bg-surface hover:text-ink"
          >
            <X aria-hidden="true" size={16} />
            <span className="sr-only">Clear {label.toLowerCase()}</span>
          </button>
        )}
      </div>
      {hint && (
        <p id={`${id}-hint`} className="field-hint">
          {hint}
        </p>
      )}
      <p className="sr-only" aria-live="polite">
        {open && text.trim() ? `${results.length} ${results.length === 1 ? 'match' : 'matches'}` : ''}
      </p>
      <AnimatePresence>
        {open && text.trim().length > 0 && (
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0, transition: { duration: DUR.fast, ease: EASE } }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            className="absolute inset-x-0 top-[calc(100%+6px)] z-20 overflow-hidden rounded-[18px] bg-paper p-1.5 shadow-[0_18px_44px_-16px_rgba(21,21,20,0.35),0_1px_3px_rgba(21,21,20,0.06)]"
            // Keep focus in the input while the pointer picks an option.
            onMouseDown={(e) => e.preventDefault()}
          >
            <ul id={listId} role="listbox" aria-label={label} className="m-0 max-h-[300px] list-none overflow-y-auto overscroll-contain p-0">
              {results.map((o, i) => (
                <li
                  key={o.id}
                  id={`${id}-opt-${o.id}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(o)}
                  className={`cursor-pointer rounded-[12px] px-3.5 py-2.5 transition-colors ${i === active ? 'bg-accent-soft' : ''}`}
                >
                  <span className="block text-[0.9375rem] font-semibold">{o.label}</span>
                  {o.hint && <span className="mt-0.5 block text-[0.8125rem] leading-snug text-muted">{o.hint}</span>}
                </li>
              ))}
            </ul>
            {results.length === 0 && emptyText && <div className="px-3.5 py-3 text-[0.9375rem] text-ink-2">{emptyText(text)}</div>}
            {footer && <div className="mt-1 rounded-[12px] bg-ground p-1">{footer(close)}</div>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
