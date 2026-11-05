import { ArrowUpRight, BookOpen, Code, Database, GitFork, GraduationCap, Lock, ShieldCheck, type LucideIcon } from 'lucide-react'
import { Page } from '../components/layout/Page'
import { FaqSection } from '../components/sections/FaqSection'
import { Reveal, SplitWords, motion, useReducedMotion, EASE } from '../components/ui/motion'
import { Link, PAGES } from '../router'
import { AUTHOR, REPO } from '../site'

const PRINCIPLES: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: Code, title: 'Open source', body: 'Every line of code, every formula and every dataset is public on GitHub. Read it, check it, copy it, improve it.' },
  { icon: Database, title: 'Official data only', body: 'Inflation from PSA, fuel from DOE, dividends from Pag-IBIG and rates from each bank’s own page, each with its date.' },
  { icon: Lock, title: 'Your numbers stay with you', body: 'No sign-up, no ads, no tracking. Salary and savings inputs never leave your browser.' },
  { icon: ShieldCheck, title: 'Honest about limits', body: 'Projections are labelled as projections. Rates that are not guaranteed are never presented as if they were.' },
]

const LEARN = [
  'How much of your sweldo goes to SSS, PhilHealth, Pag-IBIG and withholding tax, and where the rest goes.',
  'Why money can grow in pesos and still shrink in what it can buy.',
  'How a tax-free MP2 dividend compares with taxed bank interest on the same savings plan.',
  'What the official inflation rate and weekly fuel adjustments actually measure.',
]

export function AboutPage() {
  const reduce = useReducedMotion()
  const fade = (delay: number) =>
    reduce ? {} : { initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.8, delay, ease: EASE } }

  return (
    <Page path="/about" title="About" description="PinansyalPH is a free, open-source project that promotes financial literacy for Filipinos with official data." next={false}>
      {/* Statement */}
      <section aria-labelledby="about-title" className="px-[var(--gutter)] pt-[clamp(24px,4vw,56px)]">
        <div className="grid gap-2 md:grid-cols-12">
          <div className="flex min-h-[46svh] flex-col justify-end bg-paper p-6 sm:p-8 md:col-span-8 lg:p-12">
            <motion.p {...fade(0)} className="ui text-[0.875rem] font-semibold tracking-[0.02em] text-accent">
              About PinansyalPH
            </motion.p>
            <h1 id="about-title" className="mt-4 text-[clamp(2.4rem,1.2rem+5vw,5.5rem)] leading-[0.98] tracking-[-0.035em]">
              <SplitWords text="Financial literacy, para sa lahat." delay={0.08} />
            </h1>
            <motion.p {...fade(0.2)} className="mt-6 max-w-[48ch] text-[1.1875rem] leading-snug text-ink-2 lg:text-[1.375rem]">
              PinansyalPH is a free, open-source set of money tools for Filipinos, built on official Philippine data.
            </motion.p>
          </div>
          <motion.div {...fade(0.3)} className="on-dark flex flex-col justify-between gap-10 bg-night p-6 text-night-ink sm:p-8 md:col-span-4">
            <GraduationCap aria-hidden="true" size={40} strokeWidth={1.4} />
            <p className="text-[1.375rem] leading-[1.3] tracking-[-0.01em]">
              The goal is simple: help more Filipinos understand where their money goes, and what it is really worth.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Objective */}
      <section aria-labelledby="why-title" className="mt-[clamp(72px,9vw,160px)]">
        <div className="wrap grid gap-8 md:grid-cols-12">
          <Reveal className="md:col-span-5">
            <h2 id="why-title" className="text-step-head">
              Why I built this
            </h2>
          </Reveal>
          <Reveal delay={0.08} className="grid gap-5 text-[1.125rem] leading-[1.65] md:col-span-6 md:col-start-7">
            <p>
              Many of us learn about money the hard way: a payslip with deductions we cannot explain, savings that look bigger
              every year but buy less, or a &ldquo;high interest&rdquo; promo that turns out to have a cap and an end date.
            </p>
            <p>
              I created PinansyalPH to promote <strong className="font-semibold">financial literacy</strong>. Instead of
              telling you what to do with your money, it shows the arithmetic, using the same numbers the PSA, DOE, Pag-IBIG
              and the banks publish, so you can see the trade-offs and decide for yourself.
            </p>
            <p>
              It is open source because a tool about trust should be open to inspection. Anyone can check how a number is
              computed, point out a mistake, or build on it.
            </p>
            <p className="ui text-[0.9375rem] text-ink-2">— {AUTHOR}, creator of PinansyalPH</p>
          </Reveal>
        </div>
      </section>

      {/* Principles */}
      <section aria-labelledby="principles-title" className="mt-[clamp(72px,9vw,160px)] px-[var(--gutter)]">
        <h2 id="principles-title" className="sr-only">
          Principles
        </h2>
        <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2 lg:grid-cols-4">
          {PRINCIPLES.map((p, i) => (
            <Reveal as="li" key={p.title} delay={0.06 * i} y={20} className="group flex flex-col gap-10 bg-surface p-6 transition-colors duration-500 hover:bg-paper sm:p-7">
              <span className="flex h-12 w-12 items-center justify-center bg-ink text-ground transition-transform duration-500 ease-[var(--ease-out-quint)] group-hover:-rotate-6">
                <p.icon aria-hidden="true" size={22} strokeWidth={1.75} />
              </span>
              <div>
                <h3 className="text-[1.5rem] leading-tight">{p.title}</h3>
                <p className="ui mt-3 text-[0.9375rem] leading-relaxed text-ink-2">{p.body}</p>
              </div>
            </Reveal>
          ))}
        </ul>
      </section>

      {/* What you can learn */}
      <section aria-labelledby="learn-title" className="mt-[clamp(72px,9vw,160px)]">
        <div className="wrap grid gap-8 md:grid-cols-12">
          <Reveal className="md:col-span-5">
            <h2 id="learn-title" className="text-[clamp(1.75rem,1.2rem+2vw,3rem)] leading-[1.08]">
              What you can learn here
            </h2>
          </Reveal>
          <ol className="m-0 grid list-none gap-0 p-0 md:col-span-6 md:col-start-7">
            {LEARN.map((l, i) => (
              <Reveal as="li" key={l} delay={0.05 * i} y={14} className="grid grid-cols-[3rem_1fr] gap-2 border-t border-surface-2 py-5 last:border-b">
                <span className="ui tabular text-[0.9375rem] font-semibold text-accent">{String(i + 1).padStart(2, '0')}</span>
                <span className="text-[1.0625rem] leading-relaxed">{l}</span>
              </Reveal>
            ))}
          </ol>
        </div>
        <div className="wrap mt-10">
          <Reveal className="ui flex flex-wrap gap-2">
            {PAGES.filter((p) => p.path !== '/about').map((p) => (
              <Link key={p.path} to={p.path} className="bg-surface px-4 py-2.5 text-[0.9375rem] font-medium transition-colors duration-200 hover:bg-ink hover:text-ground">
                {p.label}
              </Link>
            ))}
          </Reveal>
        </div>
      </section>

      {/* Contribute */}
      <section aria-labelledby="contribute-title" className="mt-[clamp(72px,9vw,160px)] px-[var(--gutter)]">
        <Reveal className="on-dark grid gap-8 bg-night p-6 text-night-ink sm:p-10 lg:grid-cols-12 lg:p-14">
          <div className="lg:col-span-7">
            <GitFork aria-hidden="true" size={36} strokeWidth={1.4} />
            <h2 id="contribute-title" className="mt-6 text-[clamp(1.75rem,1.2rem+2vw,3rem)] leading-[1.08]">
              Open source. Contributions welcome.
            </h2>
            <p className="mt-4 max-w-[54ch] text-night-muted">
              Found a wrong rate, a broken page or an idea for a new tool? Open an issue or a pull request. Data updates, fixes
              for Filipino and English copy, and accessibility improvements are all welcome.
            </p>
          </div>
          <ul className="ui m-0 grid list-none content-end gap-2 p-0 lg:col-span-5">
            {[
              { href: REPO, label: 'View the source on GitHub', icon: Code },
              { href: `${REPO}/issues/new`, label: 'Report an issue or suggest a tool', icon: ArrowUpRight },
              { href: `${REPO}/blob/main/docs/METHODOLOGY.md`, label: 'Read the methodology', icon: BookOpen },
            ].map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex min-h-[56px] items-center justify-between gap-4 bg-night-2 px-5 py-3 font-medium transition-colors duration-300 hover:bg-paper hover:text-ink"
                >
                  {l.label}
                  <l.icon aria-hidden="true" size={18} className="shrink-0 transition-transform duration-300 group-hover:translate-x-0.5" />
                </a>
              </li>
            ))}
          </ul>
        </Reveal>
      </section>

      <FaqSection />

      <section aria-labelledby="disclaimer-title" className="mt-[clamp(72px,8vw,140px)]">
        <div className="wrap grid md:grid-cols-12">
          <Reveal className="bg-warn-soft p-6 sm:p-8 md:col-span-8">
            <h2 id="disclaimer-title" className="ui text-[1rem] font-semibold">
              Not financial advice
            </h2>
            <p className="mt-2 text-[1rem] leading-relaxed">
              PinansyalPH is an educational project. Results are projections from published data and your assumptions, not
              actual earnings. It is not affiliated with PSA, DOE, Pag-IBIG Fund, BIR, SSS, PhilHealth or any bank.
            </p>
          </Reveal>
        </div>
      </section>
    </Page>
  )
}
