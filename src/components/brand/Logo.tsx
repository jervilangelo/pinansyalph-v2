import { useId } from 'react'
import logoHorizontal from '../../kit/svg/pinansyalph-logo-horizontal-color.svg'
import wordmark from '../../kit/svg/pinansyalph-wordmark-color.svg'

/**
 * The PinansyalPH symbol, taken path for path from the brand kit
 * (src/kit/svg/pinansyalph-symbol-color.svg): a rising sun whose rays are a
 * growing bar chart. The rays, sun and baseline are split into separate
 * paths only so they can move; at rest the drawing is identical to the kit.
 */
export const RAYS = [
  'M69.21 120.24L65.74 118.24A13 13 0 0 0 52.74 140.76L56.21 142.76A13 13 0 0 0 69.21 120.24Z',
  'M97.76 101.21L88.76 85.62A13 13 0 0 0 66.24 98.62L75.24 114.21A13 13 0 0 0 97.76 101.21Z',
  'M132 99L132 67A13 13 0 0 0 106 67L106 99A13 13 0 0 0 132 99Z',
  'M162.76 114.21L185.76 74.37A13 13 0 0 0 163.24 61.37L140.24 101.21A13 13 0 0 0 162.76 114.21Z',
  'M181.79 142.76L233.75 112.76A13 13 0 0 0 220.75 90.24L168.79 120.24A13 13 0 0 0 181.79 142.76Z',
]
export const BASELINE = 'M30 180H226A11 11 0 0 1 226 202H30A11 11 0 0 1 30 180Z'
export const SUN = 'M81 164A38 38 0 0 1 157 164Z'
export const BLUE = '#1D4E89'
export const GOLD = '#EDA100'

/** Small-size symbol from the kit (3 heavier rays), for anything under 48px. */
const SMALL_RAYS = [
  'M85.57 92.12L82.75 89.29A18 18 0 0 0 57.29 114.75L60.12 117.57A18 18 0 0 0 85.57 92.12Z',
  'M146 82L146 60A18 18 0 0 0 110 60L110 82A18 18 0 0 0 146 82Z',
  'M195.88 117.57L224.17 89.29A18 18 0 0 0 198.71 63.83L170.43 92.12A18 18 0 0 0 195.88 117.57Z',
]
const SMALL_BASELINE = 'M39 182H217A15 15 0 0 1 217 212H39A15 15 0 0 1 39 182Z'
const SMALL_SUN = 'M84 160A44 44 0 0 1 172 160Z'

/**
 * The symbol with its reveal: the baseline draws out from the centre, the
 * sun rises over it, then the rays come up one by one like bars on a chart.
 * Plays once. `waiting` keeps the rays pulsing (the brand loading indicator).
 */
export function AnimatedSymbol({ size = 96, play = true, waiting = false, className = '', title }: { size?: number; play?: boolean; waiting?: boolean; className?: string; title?: string }) {
  const clip = useId().replace(/:/g, '')
  return (
    <svg
      viewBox="0 0 256 256"
      width={size}
      height={size}
      className={`brand-symbol ${play ? 'is-playing' : ''} ${waiting ? 'is-waiting' : ''} ${className}`}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <defs>
        <clipPath id={`horizon-${clip}`}>
          <rect x="0" y="0" width="256" height="164.5" />
        </clipPath>
      </defs>
      <g className="bs-rays" fill={BLUE}>
        {RAYS.map((d, i) => (
          <path key={i} d={d} className="bs-ray" style={{ ['--i' as string]: i }} />
        ))}
      </g>
      <g clipPath={`url(#horizon-${clip})`}>
        <path d={SUN} fill={GOLD} className="bs-sun" />
      </g>
      <path d={BASELINE} fill={BLUE} className="bs-base" />
    </svg>
  )
}

/** Route and chart loader: the small-size symbol with its rays pulsing in order. */
export function BrandSpinner({ size = 40, label = 'Loading' }: { size?: number; label?: string }) {
  return (
    <span role="status" className="inline-flex flex-col items-center gap-2">
      <svg viewBox="0 0 256 256" width={size} height={size} aria-hidden="true" focusable="false">
        <g className="ray-pulse" fill={BLUE}>
          {SMALL_RAYS.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
        <path d={SMALL_SUN} fill={GOLD} />
        <path d={SMALL_BASELINE} fill={BLUE} />
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  )
}

/** Static small-size symbol, for compact places (under 48px). */
export function SymbolSmall({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 256 256" width={size} height={size} aria-hidden="true" focusable="false" className={className}>
      <g fill={BLUE}>
        {SMALL_RAYS.map((d) => (
          <path key={d} d={d} />
        ))}
        <path d={SMALL_BASELINE} />
      </g>
      <path d={SMALL_SUN} fill={GOLD} />
    </svg>
  )
}

/** The horizontal lockup from the kit, as shipped. Minimum 160px wide. */
export function LogoHorizontal({ height = 40, className }: { height?: number; className?: string }) {
  return <img src={logoHorizontal} alt="PinansyalPH" width={Math.round((height * 995) / 256)} height={height} className={className} decoding="async" />
}

export function Wordmark({ height = 32, className, alt = 'PinansyalPH' }: { height?: number; className?: string; alt?: string }) {
  return <img src={wordmark} alt={alt} width={Math.round((height * 861) / 140)} height={height} className={className} decoding="async" />
}
