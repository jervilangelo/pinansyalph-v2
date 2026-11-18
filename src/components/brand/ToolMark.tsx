import type { Route } from '../../router'
import { TOOL_MARKS } from './toolMarks'

const FILL = { blue: 'var(--color-accent)', gold: 'var(--color-sun)' } as const

/** A tool's own mark (see toolMarks.ts). Decorative: the tool's name is always next to it. */
export function ToolMark({ path, size = 32, className = '' }: { path: Route; size?: number; className?: string }) {
  const parts = TOOL_MARKS[path]
  if (!parts) return null
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true" focusable="false" className={`tool-mark shrink-0 ${className}`}>
      {parts.map((p, i) => (
        <path key={i} d={p.d} fill={FILL[p.tone]} fillRule="evenodd" transform={p.transform} className={`tm-${p.tone}`} />
      ))}
    </svg>
  )
}
