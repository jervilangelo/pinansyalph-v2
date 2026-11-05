import { ArrowRight } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { Link, PAGES, useScrollOnEnter, type Route } from '../../router'
import { SITE_NAME } from '../../site'
import { Reveal } from '../ui/motion'

const DEFAULT_DESCRIPTION =
  'Free Philippine money calculators: sweldo and expenses, Pag-IBIG MP2, digital bank savings and official PSA inflation.'

/** Sets the document title and description, scrolls to the hash, and adds "next tool" navigation. */
export function Page({ path, title, description, children, next = true }: { path: Route; title?: string; description?: string; children: ReactNode; next?: boolean }) {
  useScrollOnEnter()
  useEffect(() => {
    document.title = title ? `${title} · ${SITE_NAME}` : `${SITE_NAME}: sweldo, MP2, savings and inflation calculators`
    document.querySelector('meta[name="description"]')?.setAttribute('content', description ?? DEFAULT_DESCRIPTION)
  }, [title, description])

  const tools = PAGES.filter((p) => p.path !== '/about')
  const i = tools.findIndex((p) => p.path === path)
  const nextPage = i >= 0 ? tools[(i + 1) % tools.length] : null

  return (
    <>
      {children}
      {next && nextPage && (
        <nav aria-label="Next tool" className="mt-[clamp(72px,8vw,140px)] px-[var(--gutter)]">
          <Reveal>
            <Link
              to={nextPage.path}
              className="group relative flex flex-col gap-3 overflow-hidden bg-surface p-6 transition-colors duration-500 hover:bg-ink hover:text-ground sm:flex-row sm:items-end sm:justify-between sm:p-10"
            >
              <span>
                <span className="ui block text-[0.875rem] font-semibold text-muted transition-colors duration-500 group-hover:text-night-muted">Next tool</span>
                <span className="mt-2 block text-[clamp(1.75rem,1.2rem+2.4vw,3.5rem)] leading-[1.05] tracking-[-0.02em]">{nextPage.title}</span>
                <span className="ui mt-3 block max-w-[52ch] text-[0.9375rem] text-ink-2 transition-colors duration-500 group-hover:text-night-muted">{nextPage.blurb}</span>
              </span>
              <ArrowRight aria-hidden="true" size={40} strokeWidth={1.5} className="shrink-0 transition-transform duration-500 ease-[var(--ease-out-quint)] group-hover:translate-x-2" />
            </Link>
          </Reveal>
        </nav>
      )}
    </>
  )
}
