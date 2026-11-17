import { ArrowRight, ChevronRight } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { GROUPS, Link, TOOLS, pageInfo, useScrollOnEnter, type Route } from '../../router'
import { SITE_NAME } from '../../site'
import { markAppReady } from '../../splash'
import { Reveal, motion, useEnter } from '../ui/motion'

const DEFAULT_DESCRIPTION = 'Free Philippine money calculators: sweldo and take-home pay, 13th month pay, Pag-IBIG MP2, digital bank savings and official PSA inflation.'

/** Sets the document title and description, scrolls to the hash, signals the splash, and suggests the next tool. */
export function Page({ path, title, description, children, next = true }: { path: Route; title?: string; description?: string; children: ReactNode; next?: boolean }) {
  useScrollOnEnter()
  useEffect(() => {
    document.title = title ? `${title} · ${SITE_NAME}` : `${SITE_NAME}: Mas malinaw ang pera mo`
    document.querySelector('meta[name="description"]')?.setAttribute('content', description ?? DEFAULT_DESCRIPTION)
  }, [title, description])
  // The real page is on screen: the splash can go.
  useEffect(() => markAppReady(), [])

  const i = TOOLS.findIndex((p) => p.path === path)
  const nextPage = i >= 0 ? TOOLS[(i + 1) % TOOLS.length] : null

  return (
    <>
      {children}
      {next && nextPage && (
        <nav aria-label="Next tool" className="wrap mt-[clamp(80px,9vw,140px)]">
          <Reveal>
            <Link
              to={nextPage.path}
              className="group flex flex-col gap-4 rounded-[28px] bg-paper p-6 transition-colors duration-300 hover:bg-accent hover:text-accent-ink sm:flex-row sm:items-center sm:justify-between sm:p-9"
            >
              <span className="min-w-0">
                <span className="ui block text-[0.875rem] font-semibold text-muted transition-colors duration-300 group-hover:text-white/80">Next tool</span>
                <span className="serif mt-1.5 block text-[clamp(1.5rem,1.2rem+1.4vw,2.5rem)] leading-[1.08] tracking-[-0.02em]">{nextPage.title}</span>
                <span className="ui mt-2 block max-w-[52ch] text-[0.9375rem] text-ink-2 transition-colors duration-300 group-hover:text-white/85">{nextPage.blurb}</span>
              </span>
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-surface transition-[background-color,transform] duration-300 ease-[var(--ease-out-quint)] group-hover:translate-x-1 group-hover:bg-white/15">
                <ArrowRight aria-hidden="true" size={24} />
              </span>
            </Link>
          </Reveal>
        </nav>
      )}
    </>
  )
}

/**
 * Tool page opening: where you are, the question the tool answers, and one
 * plain sentence on how to use it. Optional data status underneath.
 */
export function ToolHeader({ path, id, title, lede, meta, children }: { path: Route; id: string; title: ReactNode; lede: ReactNode; meta?: ReactNode; children?: ReactNode }) {
  const info = pageInfo(path)
  const group = GROUPS.find((g) => g.id === info?.group)
  const enter = useEnter()
  return (
    <header className="wrap pt-6 pb-8 sm:pt-10 sm:pb-12">
      <nav aria-label="Breadcrumb">
        <ol className="ui m-0 flex list-none flex-wrap items-center gap-1 p-0 text-[0.875rem] text-muted">
          <li>
            <Link to="/" className="rounded-full px-1 py-1 transition-colors hover:text-ink">
              Home
            </Link>
          </li>
          {group && (
            <>
              <li aria-hidden="true">
                <ChevronRight size={14} />
              </li>
              <li>{group.label}</li>
            </>
          )}
          <li aria-hidden="true">
            <ChevronRight size={14} />
          </li>
          <li aria-current="page" className="font-semibold text-ink-2">
            {info?.name}
          </li>
        </ol>
      </nav>
      <div className="mt-5 grid gap-5 lg:grid-cols-12 lg:items-end lg:gap-10">
        <motion.h1 {...enter(0)} id={id} className="text-step-head lg:col-span-7">
          {title}
        </motion.h1>
        <motion.div {...enter(0.08)} className="lg:col-span-5 lg:pb-1.5">
          <div className="text-[1.0625rem] leading-relaxed text-ink-2">{lede}</div>
          {meta && <div className="mt-3">{meta}</div>}
        </motion.div>
      </div>
      {children}
    </header>
  )
}
