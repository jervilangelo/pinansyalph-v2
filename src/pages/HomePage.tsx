import { ArrowUpRight, Fuel, Landmark, PiggyBank, Scale, TrendingUp, Wallet, type LucideIcon } from 'lucide-react'
import { Page } from '../components/layout/Page'
import { Hero } from '../components/sections/Hero'
import { Intro } from '../components/sections/Intro'
import { Reveal } from '../components/ui/motion'
import { Link, PAGES } from '../router'

const ICONS: Record<string, LucideIcon> = {
  '/sweldo': Wallet,
  '/mp2': PiggyBank,
  '/banks': Landmark,
  '/compare': Scale,
  '/inflation': TrendingUp,
  '/gas': Fuel,
}

function Tools() {
  const tools = PAGES.filter((p) => p.path in ICONS)
  return (
    <section aria-labelledby="tools-title" className="mt-[clamp(96px,12vw,200px)] px-[var(--gutter)]">
      <div className="grid gap-4 md:grid-cols-12 md:items-end">
        <Reveal className="md:col-span-7">
          <h2 id="tools-title" className="text-step-head">
            Pick a tool
          </h2>
        </Reveal>
        <Reveal delay={0.08} className="md:col-span-5">
          <p className="text-ink-2">Each calculator has its own page. Your amounts carry over between MP2, digital banks and the comparison.</p>
        </Reveal>
      </div>
      <ul className="m-0 mt-10 grid list-none gap-2 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((t, i) => {
          const Icon = ICONS[t.path]
          return (
            <Reveal as="li" key={t.path} delay={0.05 * i} y={20}>
              <Link
                to={t.path}
                className="group relative flex h-full min-h-[220px] flex-col justify-between gap-8 overflow-hidden bg-paper p-6 transition-[background-color,color,transform] duration-500 ease-[var(--ease-out-quint)] hover:-translate-y-1 hover:bg-ink hover:text-ground sm:p-7"
              >
                <span className="flex items-start justify-between">
                  <span className="flex h-12 w-12 items-center justify-center bg-surface text-ink transition-colors duration-500 group-hover:bg-accent group-hover:text-accent-ink">
                    <Icon aria-hidden="true" size={22} strokeWidth={1.75} />
                  </span>
                  <ArrowUpRight
                    aria-hidden="true"
                    size={26}
                    strokeWidth={1.5}
                    className="transition-transform duration-500 ease-[var(--ease-out-quint)] group-hover:translate-x-1 group-hover:-translate-y-1"
                  />
                </span>
                <span>
                  <span className="ui block text-[0.8125rem] font-semibold tracking-[0.04em] text-muted uppercase transition-colors duration-500 group-hover:text-night-muted">
                    {t.label}
                  </span>
                  <span className="mt-2 block text-[1.625rem] leading-[1.1] tracking-[-0.015em]">{t.title}</span>
                  <span className="ui mt-3 block text-[0.9375rem] leading-relaxed text-ink-2 transition-colors duration-500 group-hover:text-night-muted">{t.blurb}</span>
                </span>
              </Link>
            </Reveal>
          )
        })}
      </ul>
    </section>
  )
}

function AboutTeaser() {
  return (
    <section aria-labelledby="teaser-title" className="mt-2 px-[var(--gutter)]">
      <Reveal className="on-accent grid gap-6 bg-accent p-6 text-accent-ink sm:p-10 md:grid-cols-12 md:items-end">
        <div className="md:col-span-8">
          <h2 id="teaser-title" className="text-[clamp(1.75rem,1.2rem+2vw,3rem)] leading-[1.08]">
            Open source, built for financial literacy.
          </h2>
          <p className="mt-4 max-w-[56ch] text-[1.0625rem] leading-relaxed opacity-90">
            Free tools that show the real numbers behind sweldo, savings and inflation, so more Filipinos can make informed money
            decisions.
          </p>
        </div>
        <div className="md:col-span-4 md:justify-self-end">
          <Link to="/about" className="btn btn-paper group">
            About the project
            <ArrowUpRight aria-hidden="true" size={18} className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>
      </Reveal>
    </section>
  )
}

export function HomePage() {
  return (
    <Page path="/" next={false}>
      <Hero />
      <Tools />
      <Intro />
      <AboutTeaser />
    </Page>
  )
}
