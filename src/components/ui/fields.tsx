import { useId, useState, useEffect, type ReactNode } from 'react'
import { SPRING, motion, useReducedMotion } from './motion'

/** Peso amount input: accepts commas, shows them back, reports errors in words. */
export function AmountField({
  label,
  value,
  onChange,
  hint,
  max = 1_000_000_000_000,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  hint?: string
  max?: number
}) {
  const id = useId()
  const [text, setText] = useState(value ? value.toLocaleString('en-PH') : '0')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Keep in sync when another control changes the shared value.
    const current = Number(text.replace(/[₱,\s]/g, ''))
    if (current !== value) setText(value.toLocaleString('en-PH'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  function commit(raw: string) {
    setText(raw)
    const cleaned = raw.replace(/[₱,\s]/g, '')
    if (cleaned === '') {
      setError(null)
      onChange(0)
      return
    }
    const n = Number(cleaned)
    if (!Number.isFinite(n)) return setError('Enter a number, like 5,000.')
    if (n < 0) return setError('Amounts cannot be negative.')
    if (n > max) return setError('That is more than ₱1 trillion.')
    setError(null)
    onChange(Math.round(n * 100) / 100)
  }

  return (
    <div className="ui">
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <div className="relative">
        <span aria-hidden="true" className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted">
          ₱
        </span>
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          className="field-input pl-9"
          value={text}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error || hint ? `${id}-desc` : undefined}
          onChange={(e) => commit(e.target.value)}
          onBlur={() => !error && setText(value.toLocaleString('en-PH'))}
        />
      </div>
      {(error || hint) && (
        <p id={`${id}-desc`} className={`field-hint ${error ? 'field-error' : ''}`} role={error ? 'alert' : undefined}>
          {error ?? hint}
        </p>
      )}
    </div>
  )
}

export function NumberField({
  label,
  value,
  onChange,
  suffix,
  min,
  max,
  step = 0.01,
  hint,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  suffix?: string
  min: number
  max: number
  step?: number
  hint?: string
}) {
  const id = useId()
  const [text, setText] = useState(String(value))
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (Number(text) !== value) setText(String(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <div className="ui">
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          className={`field-input ${suffix ? 'pr-24' : ''}`}
          value={text}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error || hint ? `${id}-desc` : undefined}
          onChange={(e) => {
            setText(e.target.value)
            const n = Number(e.target.value)
            if (e.target.value.trim() === '' || !Number.isFinite(n)) return setError('Enter a number.')
            if (n < min || n > max) return setError(`Use a value from ${min} to ${max}.`)
            setError(null)
            onChange(n)
          }}
        />
        {suffix && (
          <span aria-hidden="true" className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-muted">
            {suffix}
          </span>
        )}
      </div>
      {(error || hint) && (
        <p id={`${id}-desc`} className={`field-hint ${error ? 'field-error' : ''}`} role={error ? 'alert' : undefined}>
          {error ?? hint}
        </p>
      )}
    </div>
  )
}

export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  hint,
}: {
  label: string
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  hint?: ReactNode
}) {
  const id = useId()
  return (
    <div className="ui">
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <select id={id} className="field-input" value={value} onChange={(e) => onChange(e.target.value as T)} aria-describedby={hint ? `${id}-desc` : undefined}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && (
        <p id={`${id}-desc`} className="field-hint">
          {hint}
        </p>
      )}
    </div>
  )
}

/**
 * Segmented choice (radio group) with a sliding thumb.
 * Native radios underneath, so arrow keys and screen readers work.
 */
export function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
  hideLabel = false,
  wrap = false,
}: {
  label: string
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  /** Kept for compatibility; v3 has one light tone. */
  tone?: 'light' | 'dark'
  hideLabel?: boolean
  /** Two rows on small screens when there are many options. */
  wrap?: boolean
}) {
  const name = useId()
  const reduce = useReducedMotion()
  return (
    <fieldset className="ui m-0 min-w-0 border-0 p-0">
      <legend className={hideLabel ? 'sr-only' : 'field-label p-0'}>{label}</legend>
      <div className={`relative ${wrap ? 'grid grid-cols-2 sm:flex' : 'flex'} gap-0.5 rounded-[16px] bg-surface p-1`}>
        {options.map((o) => {
          const active = o.value === value
          return (
            <label key={o.value} className="relative flex-1 cursor-pointer">
              <input type="radio" name={name} value={o.value} checked={active} onChange={() => onChange(o.value)} className="peer sr-only" />
              {active && (
                <motion.span
                  layoutId={`seg-${name}`}
                  aria-hidden="true"
                  className="absolute inset-0 rounded-[12px] bg-paper shadow-[0_1px_2px_rgba(21,21,20,0.08),0_2px_8px_-2px_rgba(21,21,20,0.10)]"
                  transition={reduce ? { duration: 0 } : SPRING}
                />
              )}
              <span
                className={`relative flex min-h-11 items-center justify-center rounded-[12px] px-3 py-2 text-center text-[0.9375rem] leading-tight font-medium transition-colors duration-200 peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent ${active ? 'text-ink' : 'text-ink-2 hover:text-ink'}`}
              >
                {o.label}
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

/** On/off setting, drawn as a switch over a native checkbox. */
export function Toggle({ label, checked, onChange, description }: { label: string; checked: boolean; onChange: (v: boolean) => void; description?: ReactNode }) {
  const id = useId()
  return (
    <div className="ui flex items-start gap-3.5">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="switch mt-0.5" aria-describedby={description ? `${id}-d` : undefined} />
      <div className="min-w-0">
        <label htmlFor={id} className="cursor-pointer text-[0.9375rem] leading-snug font-medium">
          {label}
        </label>
        {description && (
          <p id={`${id}-d`} className="field-hint !mt-0.5">
            {description}
          </p>
        )}
      </div>
    </div>
  )
}

/**
 * Optional peso amount: empty means "not entered" (null), which is different
 * from ₱0. The placeholder shows what is used when it is left empty.
 */
export function OptionalAmountField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  compact = false,
}: {
  label: string
  value: number | null
  onChange: (v: number | null) => void
  placeholder?: string
  hint?: string
  compact?: boolean
}) {
  const id = useId()
  const [text, setText] = useState(value == null ? '' : value.toLocaleString('en-PH'))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const cleaned = text.replace(/[₱,\s]/g, '')
    const current = cleaned === '' ? null : Number(cleaned)
    if (current !== value) setText(value == null ? '' : value.toLocaleString('en-PH'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  function commit(raw: string) {
    setText(raw)
    const cleaned = raw.replace(/[₱,\s]/g, '')
    if (cleaned === '') {
      setError(null)
      return onChange(null)
    }
    const n = Number(cleaned)
    if (!Number.isFinite(n)) return setError('Enter a number, like 5,000.')
    if (n < 0) return setError('Amounts cannot be negative.')
    if (n > 1_000_000_000_000) return setError('That is more than ₱1 trillion.')
    setError(null)
    onChange(Math.round(n * 100) / 100)
  }

  return (
    <div className="ui">
      <label htmlFor={id} className={`field-label ${compact ? '!text-[0.875rem]' : ''}`}>
        {label}
      </label>
      <div className="relative">
        <span aria-hidden="true" className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted">
          ₱
        </span>
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          className="field-input pl-9"
          value={text}
          placeholder={placeholder}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error || hint ? `${id}-desc` : undefined}
          onChange={(e) => commit(e.target.value)}
          onBlur={() => !error && value != null && setText(value.toLocaleString('en-PH'))}
        />
      </div>
      {(error || hint) && (
        <p id={`${id}-desc`} className={`field-hint ${error ? 'field-error' : ''}`} role={error ? 'alert' : undefined}>
          {error ?? hint}
        </p>
      )}
    </div>
  )
}

/** Native date input with the same look as the other fields. */
export function DateField({ label, value, onChange, hint, min, max, optional = false }: { label: string; value: string; onChange: (v: string) => void; hint?: ReactNode; min?: string; max?: string; optional?: boolean }) {
  const id = useId()
  return (
    <div className="ui">
      <label htmlFor={id} className="field-label">
        {label}
        {optional && <span className="font-normal text-muted"> (optional)</span>}
      </label>
      <input id={id} type="date" className="field-input" value={value} min={min} max={max} onChange={(e) => onChange(e.target.value)} aria-describedby={hint ? `${id}-desc` : undefined} />
      {hint && (
        <p id={`${id}-desc`} className="field-hint">
          {hint}
        </p>
      )}
    </div>
  )
}
