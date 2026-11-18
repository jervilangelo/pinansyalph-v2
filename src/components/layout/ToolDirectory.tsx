import { ArrowRight } from 'lucide-react'
import { GROUPS, Link, TOOLS, useRouter, type PageInfo } from '../../router'
import { ToolMark } from '../brand/ToolMark'

/**
 * The tools, grouped by the question a visitor brings. Used by the header
 * menu (desktop panel and phone sheet).
 *
 * Group names are small labelled column headers over a rule, so they read as
 * headings and never as one more link. Each tool is one row: its own mark,
 * its name, and one line on what it does.
 */
export function ToolDirectory({ onNavigate, compact = false }: { onNavigate?: () => void; compact?: boolean }) {
  const { path } = useRouter()
  return (
    <div className={`grid ${compact ? 'gap-6' : 'gap-6 md:grid-cols-2 md:gap-y-6 lg:grid-cols-4 lg:gap-0 lg:divide-x lg:divide-line'}`}>
      {GROUPS.map((g) => {
        const tools = TOOLS.filter((t) => t.group === g.id)
        return (
          <section key={g.id} aria-labelledby={`dir-${g.id}`} className={compact ? '' : 'lg:px-3 lg:first:pl-0 lg:last:pr-0'}>
            <h2 id={`dir-${g.id}`} className="ui mx-3 flex items-baseline gap-2 border-b border-line pb-2.5 text-[0.8125rem] leading-none font-semibold tracking-[0.08em] uppercase">
              <span className="text-accent">{g.label}</span>
              <span className="font-medium tracking-normal text-muted normal-case">{g.gloss}</span>
              <span className="ml-auto font-medium tracking-normal text-muted normal-case tabular-nums">{tools.length}</span>
            </h2>
            <ul className="m-0 mt-2 grid list-none gap-0.5 p-0">
              {tools.map((t) => (
                <li key={t.path}>
                  <ToolLink t={t} active={path === t.path} onNavigate={onNavigate} />
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

function ToolLink({ t, active, onNavigate }: { t: PageInfo; active: boolean; onNavigate?: () => void }) {
  return (
    <Link
      to={t.path}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className="ui group flex min-h-[56px] items-center gap-3 rounded-[14px] px-3 py-2.5 transition-colors duration-200 hover:bg-surface focus-visible:bg-surface aria-[current=page]:bg-accent-soft"
    >
      <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-ground transition-transform duration-300 ease-[var(--ease-out-quint)] group-hover:-translate-y-0.5">
        <ToolMark path={t.path} size={30} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-[0.9375rem] leading-snug font-semibold text-ink group-hover:text-accent group-aria-[current=page]:text-accent">
          {t.label}
          {active && <span className="rounded-full bg-paper px-2 py-0.5 text-[0.6875rem] font-semibold text-accent">You are here</span>}
        </span>
        <span className="mt-0.5 block text-[0.8125rem] leading-snug text-muted">{t.hint ?? t.blurb}</span>
      </span>
      <ArrowRight aria-hidden="true" size={16} className="shrink-0 text-muted opacity-0 transition-[transform,opacity] duration-300 ease-[var(--ease-out-quint)] group-hover:translate-x-0.5 group-hover:text-accent group-hover:opacity-100" />
    </Link>
  )
}
