import type { VerificationStatus } from '../../types/data'
import { dateLabel } from '../../utils/format'

const TEXT: Record<VerificationStatus, string> = {
  verified: 'Official data',
  'verified-manual': 'Checked on the official page',
  'verified-secondary': 'Official declaration, as reported',
  stale: 'May be outdated',
  'needs-review': 'Under review — may have changed',
}

/**
 * Data status in words with a filled marker. Never colour alone; never
 * the word "live" — every figure here is the latest *published* value.
 */
export function StatusTag({ status, extra, tone = 'light' }: { status: VerificationStatus | 'historical' | 'assumption'; extra?: string; tone?: 'light' | 'dark' }) {
  const label = status === 'historical' ? 'Historical, declared' : status === 'assumption' ? 'Your assumption' : TEXT[status]
  const warn = status === 'stale' || status === 'needs-review'
  const dot = warn ? 'bg-loss' : status === 'assumption' ? 'bg-s4' : tone === 'dark' ? 'bg-night-ink' : 'bg-gain'
  return (
    <span className={`ui inline-flex items-center gap-2 text-[0.8125rem] leading-snug font-medium ${warn ? 'text-loss' : ''}`}>
      <span aria-hidden="true" className={`inline-block h-2 w-2 shrink-0 rounded-full ${dot}`} />
      <span>
        {label}
        {extra ? ` · ${extra}` : ''}
      </span>
    </span>
  )
}

export function Retrieved({ iso }: { iso: string }) {
  return <>Updated {dateLabel(iso)}</>
}
