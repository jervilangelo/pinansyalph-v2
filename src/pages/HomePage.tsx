import { ArrowRight, ArrowUpRight, Heart } from 'lucide-react'
import { useMemo, useState } from 'react'
import { calculatePayroll } from '../calculators/payroll'
import { AnimatedSymbol } from '../components/brand/Logo'
import { Page } from '../components/layout/Page'
import { useSupport } from '../components/support/Support'
import { AmountField } from '../components/ui/fields'
import { AnimatedNumber, Reveal, SplitWords, motion, useEnter } from '../components/ui/motion'
import { SunMark } from '../components/ui/Result'
import { StatusTag } from '../components/ui/Status'
import { basePurchasingPowerYear, fuel, inflation, latestFuel, latestHeadline, latestMp2, latestPurchasingPower, payrollRules } from '../data'
import { safe } from '../hooks/useScenario'
import { GROUPS, Link, TOOLS } from '../router'
import { TAGLINE } from '../site'
import { useSplashGone } from '../splash'
import { dateLabel, monthLabel, peso, perLiter } from '../utils/format'

const BASE = import.meta.env.BASE_URL

/* ------------------------------------------------------------------ */
/* The live thing: type a salary, see the take-home pay.               */
/* ------------------------------------------------------------------ */

function QuickPay() {
  const [basic, setBasic] = useState(30000)
  const r = useMemo(
    () =>
      safe(() =>
        calculatePayroll(
          { basic, taxableAllowances: 0, otherTaxable: 0, nonTaxableAllowances: 0, overtime: 0, frequency: 'semiMonthly', minimumWageEarner: false, otherDeductions: 0, annualBonus: 0 },
          payrollRules,
        ),
      ),
    [basic],
  )
  const rows = r.ok
    ? [
        { label: 'SSS', value: r.value.sss.employee.toNumber(), color: '#7d9cc4' },
        { label: 'PhilHealth', value: r.value.philhealth.toNumber(), color: '#a9c0dd' },
        { label: 'Pag-IBIG', value: r.value.pagibig.toNumber(), color: '#cfdcec' },
        { label: 'Withholding tax', value: r.value.withholdingMonthly.toNumber(), color: '#EDA100' },
      ]
    : []
  const gross = r.ok ? r.value.grossMonthly.toNumber() : 0
  const take = r.ok ? r.value.takeHomeMonthly.toNumber() : 0

  return (
    <section aria-labelledby="quick-title" className="card p-5 sm:p-8">
      <h2 id="quick-title" className="text-[clamp(1.375rem,1.2rem+0.6vw,1.75rem)] leading-tight">
        Magkano ang matatanggap mo?
      </h2>
      <p className="ui mt-1.5 text-[0.9375rem] text-muted">Type your monthly basic salary. The answer updates as you type.</p>
      <form className="mt-6" onSubmit={(e) => e.preventDefault()}>
        <AmountField label="Monthly basic salary" value={basic} onChange={setBasic} />
      </form>

      {r.ok ? (
        <div className="mt-6" aria-live="polite">
          <div className="rounded-[22px] bg-accent p-5 text-accent-ink sm:p-6">
            <p className="ui flex items-center gap-2.5 text-[0.9375rem] font-semibold text-white/90">
              <SunMark />
              Estimated take-home pay
            </p>
            <p className="figure mt-3 text-[clamp(2.5rem,1.8rem+3vw,3.75rem)] leading-none">
              <AnimatedNumber value={take} format={peso} testId="quick-take-home" />
            </p>
            <p className="ui mt-2 text-[0.9375rem] text-white/85">a month, after government deductions</p>
          </div>

          {gross > 0 && (
            <div className="mt-5">
              <div className="flex h-2.5 overflow-hidden rounded-full bg-surface" role="img" aria-label={`Of ${peso(gross)} gross: ${peso(take)} take-home, ${rows.map((x) => `${peso(x.value)} ${x.label}`).join(', ')}`}>
                <motion.span className="h-full bg-accent" animate={{ width: `${(take / gross) * 100}%` }} transition={{ duration: 0.5 }} />
                {rows.map((x) => (
                  <motion.span key={x.label} className="h-full" style={{ background: x.color }} animate={{ width: `${(x.value / gross) * 100}%` }} transition={{ duration: 0.5 }} />
                ))}
              </div>
              <dl className="ui m-0 mt-4 grid gap-x-6 gap-y-2.5 text-[0.9375rem] min-[420px]:grid-cols-2">
                {rows.map((x) => (
                  <div key={x.label} className="flex items-center justify-between gap-3">
                    <dt className="flex items-center gap-2 text-ink-2">
                      <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: x.color }} />
                      {x.label}
                    </dt>
                    <dd className="tabular m-0 font-semibold">{peso(x.value)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="ui text-[0.8125rem] leading-snug text-muted">Rank-and-file employee, no allowances. An estimate using current official tables.</p>
            <Link to={`/sweldo?basic=${basic}`} className="btn btn-soft btn-sm group shrink-0">
              Full breakdown
              <ArrowRight aria-hidden="true" size={16} className="transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      ) : (
        <p role="alert" className="ui mt-6 rounded-[16px] bg-loss-soft p-4 text-loss">
          {r.error}
        </p>
      )}
    </section>
  )
}

/* ------------------------------------------------------------------ */

function Hero({ ready }: { ready: boolean }) {
  const enter = useEnter()
  return (
    <header className="wrap grid items-center gap-10 pt-8 pb-4 sm:pt-14 lg:grid-cols-12 lg:gap-12 lg:pt-16">
      {/* Keyed so the entrance replays once the splash has gone; the estimator keeps its state. */}
      <div key={ready ? 'shown' : 'covered'} className="lg:col-span-7">
        <AnimatedSymbol size={88} className="-ml-2 h-[72px] w-[72px] sm:h-[88px] sm:w-[88px]" />
        <h1 className="mt-5 max-w-[13ch] text-[clamp(2.75rem,1.5rem+4.6vw,5.5rem)] leading-[0.98] tracking-[-0.035em]">
          <SplitWords text={TAGLINE} delay={0.55} />
        </h1>
        <motion.p {...enter(0.85)} className="mt-6 max-w-[34ch] text-step-lead leading-snug text-ink-2">
          Free calculators for your sweldo, ipon, and the prices you pay, built on official Philippine data.
        </motion.p>
        <motion.div {...enter(0.95)} className="mt-8 flex flex-wrap items-center gap-3">
          <Link to="/sweldo" className="btn btn-primary group">
            Compute my take-home pay
            <ArrowRight aria-hidden="true" size={18} className="transition-transform duration-300 ease-[var(--ease-out-quint)] group-hover:translate-x-1" />
          </Link>
          <a href="#tools" className="btn btn-soft">
            See all tools
          </a>
        </motion.div>
        <motion.p {...enter(1.05)} className="ui mt-6 text-[0.875rem] text-muted">
          Walang sign-up. Your numbers stay on your device.
        </motion.p>
      </div>
      <motion.div {...enter(0.4)} className="lg:col-span-5">
        <QuickPay />
      </motion.div>
    </header>
  )
}

/* ------------------------------------------------------------------ */

function Tools() {
  return (
    <section id="tools" aria-labelledby="tools-title" className="wrap mt-[clamp(96px,11vw,170px)] scroll-mt-24">
      <Reveal>
        <h2 id="tools-title" className="text-step-head max-w-[16ch]">
          Ano ang gusto mong malaman?
        </h2>
        <p className="mt-4 max-w-[52ch] text-step-lead leading-snug text-ink-2">Seven tools, in three plain questions. Each one opens with the answer, and shows its working when you ask.</p>
      </Reveal>
      <div className="mt-12 grid gap-4">
        {GROUPS.map((g, gi) => (
          <Reveal key={g.id} delay={0.05 * gi} className="grid gap-3 rounded-[28px] bg-paper p-3 sm:p-4 lg:grid-cols-12 lg:gap-4">
            <div className="px-3 pt-3 pb-1 sm:px-4 lg:col-span-4 lg:py-5">
              <h3 className="text-[clamp(1.75rem,1.4rem+1.2vw,2.5rem)] leading-none">{g.label}</h3>
              <p className="ui mt-2 text-[0.9375rem] text-muted">{g.question}</p>
            </div>
            <ul className={`m-0 grid list-none gap-2 p-0 sm:grid-cols-2 lg:col-span-8 ${TOOLS.filter((t) => t.group === g.id).length > 2 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'}`}>
              {TOOLS.filter((t) => t.group === g.id).map((t) => (
                <li key={t.path} className="flex">
                  <Link
                    to={t.path}
                    className="group flex min-h-[148px] w-full flex-col justify-between gap-6 rounded-[22px] bg-ground p-5 transition-[background-color,color,transform] duration-300 ease-[var(--ease-out-quint)] hover:-translate-y-0.5 hover:bg-accent hover:text-accent-ink active:translate-y-0"
                  >
                    <span>
                      <span className="serif block text-[1.375rem] leading-tight tracking-[-0.015em]">{t.name}</span>
                      <span className="ui mt-2 block text-[0.875rem] leading-snug text-muted transition-colors duration-300 group-hover:text-white/85">{t.blurb}</span>
                    </span>
                    <span className="ui flex items-center gap-1.5 text-[0.875rem] font-semibold">
                      Open
                      <ArrowRight aria-hidden="true" size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */

function Numbers() {
  const centavos = Math.round(latestPurchasingPower.value * 100)
  const diesel = latestFuel.diesel
  const tiles = [
    {
      to: '/inflation',
      label: 'Inflation',
      value: <AnimatedNumber value={latestHeadline.value} format={(n) => `${n.toFixed(1)}%`} />,
      body: `Prices in ${monthLabel(latestHeadline.period)} were ${latestHeadline.value.toFixed(1)}% higher than a year earlier.`,
      source: `PSA · retrieved ${dateLabel(inflation.retrievedAt)}`,
      status: <StatusTag status={inflation.status} />,
    },
    {
      to: '/mp2',
      label: 'MP2 dividend',
      value: <AnimatedNumber value={latestMp2.rate} format={(n) => `${n.toFixed(2)}%`} />,
      body: `Declared by Pag-IBIG for ${latestMp2.year}. Rates are set yearly and not guaranteed.`,
      source: latestMp2.declaredOn ? `Pag-IBIG Fund · announced ${dateLabel(latestMp2.declaredOn)}` : 'Pag-IBIG Fund',
      status: <StatusTag status="historical" />,
    },
    {
      to: '/gas',
      label: 'Diesel this week',
      value: perLiter(diesel.min, diesel.max),
      body: `DOE adjustment effective ${dateLabel(latestFuel.effectiveDate)}, per liter, across oil companies.`,
      source: `DOE Oil Monitor · retrieved ${dateLabel(fuel.retrievedAt)}`,
      status: <StatusTag status={fuel.status} />,
    },
    {
      to: '/inflation',
      label: `Your ₱1 from ${basePurchasingPowerYear}`,
      value: <AnimatedNumber value={centavos} format={(n) => `${Math.round(n)}¢`} />,
      body: `is what it buys today, by PSA’s purchasing power of the peso (${monthLabel(latestPurchasingPower.period)}).`,
      source: `PSA · ${basePurchasingPowerYear} = ₱1.00`,
      status: <StatusTag status={inflation.status} />,
    },
  ]
  return (
    <section aria-labelledby="numbers-title" className="wrap mt-[clamp(96px,11vw,170px)]">
      <div className="grid gap-4 lg:grid-cols-12">
        <Reveal className="flex flex-col lg:col-span-5">
          <h2 id="numbers-title" className="text-step-head">
            Latest official numbers
          </h2>
          <p className="mt-4 max-w-[40ch] text-ink-2">
            Published figures from PSA, DOE and Pag-IBIG, each with its date. They refresh automatically when the agencies release new data, and are never estimated.
          </p>
          <figure className="relative m-0 mt-8 min-h-[260px] flex-1 overflow-hidden rounded-[28px] bg-surface-2">
            <img
              src={`${BASE}images/jeepney-1400.webp`}
              srcSet={`${BASE}images/jeepney-800.webp 800w, ${BASE}images/jeepney-1400.webp 1400w`}
              sizes="(min-width: 1024px) 40vw, 100vw"
              width={1400}
              height={1050}
              loading="lazy"
              alt="A jeepney turning at a sunny Manila street corner under tangled power lines"
              className="absolute inset-0 h-full w-full object-cover object-[62%_60%] transition-transform duration-[1400ms] ease-[var(--ease-out-quint)] hover:scale-[1.03]"
            />
            <figcaption className="ui absolute bottom-3 left-3 rounded-full bg-paper/95 px-3 py-1.5 text-[0.8125rem] font-medium">Pedro Gil, Manila</figcaption>
          </figure>
        </Reveal>
        <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 lg:col-span-7">
          {tiles.map((t, i) => (
            <Reveal as="li" key={t.label} delay={0.06 * i} className="flex">
              <Link to={t.to} className="group flex w-full flex-col rounded-[28px] bg-paper p-6 transition-colors duration-300 hover:bg-accent-soft sm:p-7">
                <span className="flex items-center justify-between gap-3">
                  <span className="ui text-[0.9375rem] font-semibold">{t.label}</span>
                  <ArrowUpRight aria-hidden="true" size={20} className="text-muted transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent" />
                </span>
                <span className="figure mt-5 block text-[clamp(2.25rem,1.8rem+1.6vw,3.25rem)] leading-none">{t.value}</span>
                <span className="mt-3 block text-[0.9375rem] leading-relaxed text-ink-2">{t.body}</span>
                <span className="ui mt-auto block pt-5 text-[0.8125rem] leading-relaxed text-muted">
                  {t.source}
                  <span className="mt-1 block">{t.status}</span>
                </span>
              </Link>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */

function OpenSource() {
  const { openSupport } = useSupport()
  return (
    <section aria-labelledby="open-title" className="wrap mt-[clamp(96px,11vw,170px)]">
      <Reveal className="grid gap-8 rounded-[32px] bg-accent-soft p-6 sm:p-10 lg:grid-cols-12 lg:items-end lg:p-14">
        <div className="lg:col-span-8">
          <AnimatedSymbol size={56} play={false} />
          <h2 id="open-title" className="text-step-head mt-6 max-w-[18ch]">
            Libre, open source, para sa lahat.
          </h2>
          <p className="mt-4 max-w-[54ch] text-step-lead leading-snug text-ink-2">
            No ads, no accounts, no tracking. Every formula and dataset is public, so anyone can check how a number is made.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 lg:col-span-4 lg:justify-end">
          <button type="button" onClick={openSupport} className="btn btn-primary">
            <Heart aria-hidden="true" size={18} />
            Support the project
          </button>
          <Link to="/about" className="btn btn-paper">
            About PinansyalPH
          </Link>
        </div>
      </Reveal>
    </section>
  )
}

export function HomePage() {
  // Replay the hero's entrance once the splash has gone, so it is seen rather than played underneath.
  const ready = useSplashGone()
  return (
    <Page path="/" next={false}>
      <Hero ready={ready} />
      <Tools />
      <Numbers />
      <OpenSource />
    </Page>
  )
}
