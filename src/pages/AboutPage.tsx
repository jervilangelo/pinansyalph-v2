import { ArrowUpRight, Heart, Share2 } from 'lucide-react'
import { AnimatedSymbol } from '../components/brand/Logo'
import { Page } from '../components/layout/Page'
import { ConnectSection, PrivacySection, ToolkitSection } from '../components/about/AboutSections'
import { FaqSection } from '../components/sections/FaqSection'
import { useSupport } from '../components/support/Support'
import { Reveal, SplitWords, motion, useEnter } from '../components/ui/motion'
import { SunMark } from '../components/ui/Result'
import { Link, TOOLS } from '../router'
import { AUTHOR, EMAIL, PORTFOLIO, REPO } from '../site'
import { tx } from '../i18n/react'
import { t, tv } from '../i18n'

const PRINCIPLES: { title: string; body: string }[] = [
  { title: 'Free to use', body: 'No fees, no signup, no login and no ads. Every tool is free for every Filipino, on any phone or computer.' },
  { title: 'Official data only', body: 'Inflation from PSA, fuel from DOE, dividends from Pag-IBIG and rates from each bank’s own page, each shown with its date.' },
  { title: 'Your numbers stay with you', body: 'No sign-up, no ads, no tracking. What you enter is computed in your browser and never sent anywhere.' },
  { title: 'Honest about limits', body: 'Projections are labelled as projections. Rates that are not guaranteed are never presented as if they were.' },
]

const LEARN = [
  'How much of your sweldo goes to SSS, PhilHealth, Pag-IBIG and withholding tax, and where the rest goes.',
  'Why money can grow in pesos and still shrink in what it can buy.',
  'How a tax-free MP2 dividend compares with taxed bank interest on the same savings plan.',
  'What the official inflation rate and weekly fuel adjustments actually measure.',
  'What your appliances, internet plan and subscriptions really cost you in a month and a year.',
]

function SupportSection() {
  const { openSupport } = useSupport()
  return (
    <section aria-labelledby="support-title" className="wrap mt-[clamp(88px,10vw,150px)]">
      <Reveal className="grid overflow-hidden rounded-[32px] bg-accent text-accent-ink lg:grid-cols-12">
        <div className="on-accent p-6 sm:p-10 lg:col-span-7 lg:p-14">
          <h2 id="support-title" className="text-step-head">{t("Support PinansyalPH")}</h2>
          <p className="mt-5 max-w-[46ch] text-step-lead leading-snug text-white/90">{t("PinansyalPH is free and built by one developer. If it helped you understand your sweldo or your ipon, you can help it reach more Filipinos.")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button type="button" onClick={openSupport} className="btn btn-paper group">
              <Heart aria-hidden="true" size={18} className="text-accent transition-transform duration-300 group-hover:scale-110" />{t("Ways to support")}</button>
            <a href={PORTFOLIO} target="_blank" rel="noopener noreferrer" className="btn group bg-white/12 text-white hover:bg-white/20">{t("View Developer Portfolio")}<ArrowUpRight aria-hidden="true" size={18} className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
          </div>
        </div>
        <button
          type="button"
          onClick={openSupport}
          aria-label={t("Support PinansyalPH: share it with someone")}
          className="group relative flex min-h-[240px] cursor-pointer flex-col items-start justify-end gap-3 border-0 bg-accent-hover p-6 text-left text-white transition-colors duration-300 hover:bg-accent sm:p-10 lg:col-span-5"
        >
          <span aria-hidden="true" className="absolute top-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-white/10 transition-transform duration-500 ease-[var(--ease-out-quint)] group-hover:rotate-[72deg] group-hover:scale-110 sm:top-10 sm:right-10">
            <Share2 size={26} className="text-sun" />
          </span>
          <span className="serif text-[clamp(1.5rem,1.2rem+1.2vw,2.25rem)] leading-tight tracking-[-0.015em]">{t("Share it with someone")}</span>
          <span className="ui max-w-[34ch] text-[0.9375rem] text-white/80">{t("Free, takes ten seconds, and helps a friend or family member understand their money.")}</span>
          <span className="ui mt-2 inline-flex items-center gap-1.5 text-[0.9375rem] font-semibold">{t("Ways to share")}<ArrowUpRight aria-hidden="true" size={16} className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </button>
      </Reveal>
    </section>
  )
}

export function AboutPage() {
  const enter = useEnter()
  return (
    <Page path="/about" title={t("About")} description={t("PinansyalPH is a free project that promotes financial literacy for Filipinos with official data.")} next={false}>
      {/* Statement */}
      <header className="wrap grid gap-10 pt-10 sm:pt-16 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-8">
          <AnimatedSymbol size={72} />
          <h1 id="about-title" className="mt-6 max-w-[15ch] text-step-display leading-[0.98] tracking-[-0.035em]">
            <SplitWords text={t("Financial literacy, para sa lahat.")} delay={0.35} />
          </h1>
        </div>
        <motion.p {...enter(0.6)} className="text-step-lead leading-snug text-ink-2 lg:col-span-4 lg:pb-3">{t("PinansyalPH is a free set of money tools for Filipinos, built on official Philippine data.")}</motion.p>
      </header>

      <ToolkitSection />

      {/* Why */}
      <section aria-labelledby="why-title" className="wrap mt-[clamp(80px,9vw,140px)]">
        <div className="grid gap-8 rounded-[32px] bg-paper p-6 sm:p-10 lg:grid-cols-12 lg:p-14">
          <Reveal className="lg:col-span-5">
            <h2 id="why-title" className="text-step-head">{t("Why I built this")}</h2>
          </Reveal>
          <Reveal delay={0.08} className="grid gap-5 text-[1.125rem] leading-[1.65] lg:col-span-7">
            <p>{t("Many of us learn about money the hard way: a payslip with deductions we cannot explain, savings that look bigger every year but buy less, or a “high interest” promo that turns out to have a cap and an end date.")}</p>
            <p>{tx("I created PinansyalPH to promote {strong}. Instead of telling you what to do with your money, it shows the arithmetic, using the same numbers the PSA, DOE, Pag-IBIG and the banks publish, so you can see the trade-offs and decide for yourself.", { strong: (<strong className="font-semibold">{t("financial literacy")}</strong>), })}</p>
            <p>{t("It is free, with no signup and no ads, so anyone can use it. Every result shows how it was computed and where its numbers come from.")}</p>
            <p className="ui text-[0.9375rem] text-muted">{tx("— {link}, creator of PinansyalPH", { link: (<a className="link" href={PORTFOLIO} target="_blank" rel="noopener noreferrer">
                {AUTHOR}
              </a>), })}</p>
          </Reveal>
        </div>
      </section>

      {/* Principles */}
      <section aria-labelledby="principles-title" className="wrap mt-[clamp(80px,9vw,140px)]">
        <Reveal>
          <h2 id="principles-title" className="text-step-head max-w-[24ch]">{t("Four promises behind every number")}</h2>
        </Reveal>
        <dl className="m-0 mt-10 grid gap-x-10 gap-y-10 sm:grid-cols-2">
          {PRINCIPLES.map((p, i) => (
            <Reveal key={p.title} delay={0.05 * i}>
              <dt className="serif flex items-center gap-3 text-[1.625rem] leading-tight tracking-[-0.015em]">
                <SunMark className="h-[10px] w-5 shrink-0" />
                {tv(p.title)}
              </dt>
              <dd className="m-0 mt-3 max-w-[44ch] text-[1.0625rem] leading-relaxed text-ink-2">{tv(p.body)}</dd>
            </Reveal>
          ))}
        </dl>
      </section>

      <PrivacySection />

      <SupportSection />

      {/* What you can learn */}
      <section aria-labelledby="learn-title" className="wrap mt-[clamp(80px,9vw,140px)]">
        <div className="grid gap-8 lg:grid-cols-12">
          <Reveal className="lg:col-span-5">
            <h2 id="learn-title" className="text-step-head">{t("What you can learn here")}</h2>
            <div className="ui mt-8 flex flex-wrap gap-2">
              {TOOLS.map((p) => (
                <Link key={p.path} to={p.path} className="chip">
                  {tv(p.name)}
                </Link>
              ))}
            </div>
          </Reveal>
          <ul className="m-0 grid list-none gap-2 p-0 lg:col-span-7">
            {LEARN.map((l, i) => (
              <Reveal as="li" key={l} delay={0.05 * i} className="rounded-[22px] bg-paper px-6 py-5 text-[1.0625rem] leading-relaxed">
                {tv(l)}
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* Feedback */}
      <section aria-labelledby="contribute-title" className="wrap mt-[clamp(80px,9vw,140px)]">
        <Reveal className="grid gap-8 rounded-[32px] bg-surface p-6 sm:p-10 lg:grid-cols-12 lg:p-14">
          <div className="lg:col-span-7">
            <h2 id="contribute-title" className="text-step-head">{t("Feedback welcome")}</h2>
            <p className="mt-4 max-w-[54ch] text-ink-2">{t("Found a wrong rate, a broken page or an idea for a new tool? Send a message. Corrections, data updates and ideas for new tools are all welcome.")}</p>
          </div>
          <ul className="ui m-0 grid list-none content-end gap-2 p-0 lg:col-span-5">
            {[
              { href: `mailto:${EMAIL}`, label: 'Report an issue or suggest a tool' },
              { href: `${REPO}/blob/main/docs/METHODOLOGY.md`, label: 'Read the methodology' },
              { href: PORTFOLIO, label: 'View Developer Portfolio' },
            ].map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  {...(l.href.startsWith('mailto:') ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
                  className="group flex min-h-[56px] items-center justify-between gap-4 rounded-[18px] bg-paper px-5 py-3 font-semibold transition-colors duration-300 hover:bg-ink hover:text-ground"
                >
                  {tv(l.label)}
                  <ArrowUpRight aria-hidden="true" size={18} className="shrink-0 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </a>
              </li>
            ))}
          </ul>
        </Reveal>
      </section>

      <ConnectSection />

      <FaqSection />

      <section aria-labelledby="disclaimer-title" className="wrap mt-[clamp(72px,8vw,120px)]">
        <Reveal className="max-w-[760px] rounded-[24px] bg-warn-soft p-6 sm:p-8">
          <h2 id="disclaimer-title" className="ui text-[1rem] font-semibold tracking-normal">{t("Not financial advice")}</h2>
          <p className="mt-2 text-[1rem] leading-relaxed">{t("PinansyalPH is an educational project. Results are projections from published data and your assumptions, not actual earnings. It is not affiliated with PSA, DOE, Pag-IBIG Fund, BIR, SSS, PhilHealth or any bank.")}</p>
        </Reveal>
      </section>
    </Page>
  )
}
