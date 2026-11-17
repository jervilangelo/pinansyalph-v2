import { ArrowRight } from 'lucide-react'
import { GROUPS, Link, TOOLS, useRouter, type PageInfo } from '../../router'

/**
 * The tools, grouped by the question a visitor brings. Shared by the header
 * menu and the footer so the site has one map.
 */
export function ToolDirectory({ onNavigate, compact = false }: { onNavigate?: () => void; compact?: boolean }) {
  const { path } = useRouter()
  return (
    <div className={`grid gap-6 ${compact ? '' : 'md:grid-cols-3 md:gap-4'}`}>
      {GROUPS.map((g) => (
        <section key={g.id} aria-labelledby={`dir-${g.id}`}>
          <h2 id={`dir-${g.id}`} className="px-3 text-[1.25rem] leading-tight">
            {g.label}
            <span className="ui mt-0.5 block text-[0.875rem] font-normal tracking-normal text-muted">{g.question}</span>
          </h2>
          <ul className="m-0 mt-3 grid list-none gap-1 p-0">
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
      className="ui group flex min-h-[52px] items-center gap-3 rounded-[16px] px-3 py-2.5 transition-colors duration-200 hover:bg-surface aria-[current=page]:bg-accent-soft"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[1rem] leading-snug font-semibold group-aria-[current=page]:text-accent">{t.label}</span>
        <span className="mt-0.5 block text-[0.8125rem] leading-snug text-muted">{t.blurb}</span>
      </span>
      <ArrowRight aria-hidden="true" size={18} className="shrink-0 text-muted opacity-0 transition-[transform,opacity] duration-300 ease-[var(--ease-out-quint)] group-hover:translate-x-0.5 group-hover:opacity-100" />
    </Link>
  )
}
