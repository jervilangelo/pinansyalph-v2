import { ArrowRight } from 'lucide-react'
import { GROUPS, Link, TOOLS, useRouter, type PageInfo } from '../../router'

/**
 * The tools, grouped by the question a visitor brings. Used by the header
 * menu (desktop panel and phone sheet).
 *
 * Group names are small labelled column headers over a rule, so they read as
 * headings and never as one more link; the tools are the only large,
 * clickable rows.
 */
export function ToolDirectory({ onNavigate, compact = false }: { onNavigate?: () => void; compact?: boolean }) {
  const { path } = useRouter()
  return (
    <div className={`grid ${compact ? 'gap-7' : 'gap-7 md:grid-cols-3 md:gap-0 md:divide-x md:divide-line'}`}>
      {GROUPS.map((g) => (
        <section key={g.id} aria-labelledby={`dir-${g.id}`} className={compact ? '' : 'md:px-3 md:first:pl-0 md:last:pr-0'}>
          <h2 id={`dir-${g.id}`} className="ui mx-3 flex items-baseline gap-2 border-b border-line pb-2.5 text-[0.8125rem] leading-none font-semibold tracking-[0.08em] uppercase">
            <span className="text-accent">{g.label}</span>
            <span className="font-medium tracking-normal text-muted normal-case">{g.gloss}</span>
          </h2>
          <ul className="m-0 mt-2 grid list-none gap-0.5 p-0">
            {TOOLS.filter((t) => t.group === g.id).map((t) => (
              <li key={t.path}>
                <ToolLink t={t} active={path === t.path} onNavigate={onNavigate} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

function ToolLink({ t, active, onNavigate }: { t: PageInfo; active: boolean; onNavigate?: () => void }) {
  return (
    <Link
      to={t.path}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className="ui group flex min-h-[52px] items-start gap-3 rounded-[14px] px-3 py-2.5 transition-colors duration-200 hover:bg-surface focus-visible:bg-surface aria-[current=page]:bg-accent-soft"
    >
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-[1rem] leading-snug font-semibold text-ink group-hover:text-accent group-aria-[current=page]:text-accent">
          {t.label}
          {active && <span className="rounded-full bg-paper px-2 py-0.5 text-[0.6875rem] font-semibold text-accent">You are here</span>}
        </span>
        <span className="mt-0.5 block text-[0.8125rem] leading-snug text-muted">{t.blurb}</span>
      </span>
      <ArrowRight aria-hidden="true" size={16} className="mt-1 shrink-0 text-muted opacity-0 transition-[transform,opacity] duration-300 ease-[var(--ease-out-quint)] group-hover:translate-x-0.5 group-hover:text-accent group-hover:opacity-100" />
    </Link>
  )
}
