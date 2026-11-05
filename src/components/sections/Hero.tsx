import { ArrowRight } from 'lucide-react'
import { banks, fuel, inflation, latestFuel, latestHeadline, latestMp2, savingsBaseRange } from '../../data'
import { dateLabel, monthLabel, perLiter } from '../../utils/format'
import { AnimatedNumber, Reveal, Shutter, SplitWords, motion, useReducedMotion, EASE } from '../ui/motion'
import { StatusTag } from '../ui/Status'
import { Link } from '../../router'

const BASE = import.meta.env.BASE_URL

function Indicator({
  label,
  children,
  period,
  source,
  sourceUrl,
  updated,
  status,
  delay,
}: {
  label: string
  children: React.ReactNode
  period: string
  source: string
  sourceUrl: string
  updated: string
  status: React.ReactNode
  delay: number
}) {
  return (
    <Reveal as="li" delay={delay} y={16} className="flex flex-col bg-paper p-5">
      <div className="flex flex-col-reverse">
        <p className="ui mt-2 text-[0.9375rem] leading-snug font-semibold">
          {label} <span className="font-normal">· {period}</span>
        </p>
        <p className="tabular text-[2.25rem] leading-none font-medium tracking-[-0.02em]">{children}</p>
      </div>
      <div className="ui mt-auto pt-3 text-[0.8125rem] leading-relaxed text-muted">
        <p>
          {sourceUrl.startsWith('/') ? (
            <Link className="link" to={sourceUrl}>
              {source}
            </Link>
          ) : (
            <a className="link" href={sourceUrl} target="_blank" rel="noreferrer">
              {source}
            </a>
          )}{' '}
          · {updated}
        </p>
        <div className="mt-1">{status}</div>
      </div>
    </Reveal>
  )
}

export function Hero() {
  const reduce = useReducedMotion()
  const fade = (delay: number) =>
    reduce ? {} : { initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.8, delay, ease: EASE } }

  return (
    <header id="top">
      <div className="grid gap-2 px-[var(--gutter)] py-2 md:min-h-[min(880px,max(520px,calc(100svh-230px)))] md:grid-cols-2 md:grid-rows-2">
        {/* Name */}
        <div className="flex min-h-[34svh] flex-col justify-end bg-paper p-5 md:min-h-0 md:p-7 lg:p-10">
          <motion.p {...fade(0)} className="ui mb-5 inline-flex items-center gap-2 text-[0.875rem] font-semibold tracking-[0.02em] text-accent">
            <span aria-hidden="true" className="inline-block h-2 w-2 bg-accent" />
            PinansyalPH · free financial literacy tools
          </motion.p>
          <h1 className="text-[clamp(2.6rem,10.5vw,3.6rem)] leading-[0.98] tracking-[-0.035em] md:text-[clamp(3rem,6vw,7rem)]">
            <SplitWords text="Worth it ba sa Pilipinas?" delay={0.05} />
          </h1>
          <motion.p {...fade(0.2)} className="mt-8 max-w-[36ch] text-[1.25rem] leading-snug text-ink-2 lg:text-[1.5rem]">
            A free calculator for Pag-IBIG MP2 and digital bank savings, measured against official Philippine inflation.
          </motion.p>
        </div>

        {/* Photograph: the street, where prices are felt */}
        <figure className="relative m-0 aspect-[4/3] overflow-hidden bg-surface-2 md:aspect-auto">
          <Shutter className="absolute inset-0">
            <img
              src={`${BASE}images/jeepney-1400.webp`}
              srcSet={`${BASE}images/jeepney-800.webp 800w, ${BASE}images/jeepney-1400.webp 1400w`}
              sizes="(min-width: 768px) 50vw, 100vw"
              width={1400}
              height={1050}
              alt="A jeepney turning at a Manila street corner under tangled power lines"
              className="photo-mono h-full w-full object-cover object-[60%_55%]"
              fetchPriority="high"
            />
          </Shutter>
          <figcaption className="ui absolute bottom-0 left-0 bg-ground/90 px-3 py-1.5 text-[0.8125rem]">Pedro Gil, Manila, 2025</figcaption>
        </figure>

        {/* Photograph: the peso */}
        <figure className="group relative m-0 hidden overflow-hidden bg-surface-2 md:block">
          <img
            loading="lazy"
            src={`${BASE}images/peso-1400.webp`}
            srcSet={`${BASE}images/peso-800.webp 800w, ${BASE}images/peso-1400.webp 1400w`}
            sizes="50vw"
            width={1400}
            height={933}
            alt="Philippine peso banknotes and coins spread on a table"
            className="photo-mono absolute inset-0 h-full w-full object-cover transition-transform duration-[1200ms] ease-[var(--ease-out-quint)] group-hover:scale-[1.04]"
          />
          <figcaption className="ui absolute top-0 left-0 bg-ground/90 px-3 py-1.5 text-[0.8125rem]">The same bills buy less each year</figcaption>
        </figure>

        {/* Statements */}
        <div className="grid gap-2 sm:grid-cols-2">
          <motion.div {...fade(0.3)} className="on-dark flex flex-col justify-between gap-6 bg-night p-5 text-night-ink md:p-7">
            <p className="text-[1.5rem] leading-[1.25] tracking-[-0.01em]">Your money is growing. But is its value growing too?</p>
            <Link to="/inflation" className="btn btn-quiet group self-start px-0 text-night-ink">
              Explore PH inflation
              <ArrowRight aria-hidden="true" size={18} className="transition-transform duration-300 ease-[var(--ease-out-quint)] group-hover:translate-x-1" />
            </Link>
          </motion.div>
          <motion.div {...fade(0.4)} className="on-accent flex flex-col justify-between gap-6 bg-accent p-5 text-accent-ink md:p-7">
            <p className="text-[1.25rem] leading-[1.35]">Compare your savings, dividends and investments against Philippine inflation, using real economic data.</p>
            <Link to="/mp2" className="btn btn-paper group self-start">
              Calculate my savings
              <ArrowRight aria-hidden="true" size={18} className="transition-transform duration-300 ease-[var(--ease-out-quint)] group-hover:translate-x-1" />
            </Link>
          </motion.div>
        </div>
      </div>

      <section aria-labelledby="indicators-title" className="px-[var(--gutter)] pb-2">
        <h2 id="indicators-title" className="sr-only">
          Latest Philippine economic indicators
        </h2>
        <ul data-ui className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2 lg:grid-cols-4">
          <Indicator
            delay={0}
            label="Inflation rate"
            period={`headline, ${monthLabel(latestHeadline.period)}`}
            source="PSA OpenSTAT"
            sourceUrl="https://openstat.psa.gov.ph/"
            updated={`Retrieved ${dateLabel(inflation.retrievedAt)}`}
            status={<StatusTag status={inflation.status} extra="latest release" />}
          >
            <AnimatedNumber value={latestHeadline.value} format={(n) => `${n.toFixed(1)}%`} />
          </Indicator>
          <Indicator
            delay={0.07}
            label="Diesel, net change this year"
            period={`to ${dateLabel(latestFuel.effectiveDate)}; this week ${perLiter(latestFuel.diesel.min, latestFuel.diesel.max)}`}
            source="DOE Oil Monitor"
            sourceUrl={latestFuel.sourceUrl}
            updated={`Retrieved ${dateLabel(fuel.retrievedAt)}`}
            status={<StatusTag status={fuel.status} extra="weekly adjustment" />}
          >
            {latestFuel.ytdNet ? (
              <AnimatedNumber value={latestFuel.ytdNet.diesel} format={(n) => perLiter(n, n)} />
            ) : (
              perLiter(latestFuel.diesel.min, latestFuel.diesel.max)
            )}
          </Indicator>
          <Indicator
            delay={0.14}
            label="MP2 dividend rate"
            period={`declared for ${latestMp2.year}`}
            source="Pag-IBIG Fund"
            sourceUrl={latestMp2.sourceUrl}
            updated={latestMp2.declaredOn ? `Announced ${dateLabel(latestMp2.declaredOn)}` : 'Declared yearly'}
            status={<StatusTag status="historical" extra="not a guarantee" />}
          >
            <AnimatedNumber value={latestMp2.rate} format={(n) => `${n.toFixed(2)}%`} />
          </Indicator>
          <Indicator
            delay={0.21}
            label="Digital bank base rates"
            period={`${banks.products.filter((p) => p.kind !== 'time-deposit').length} verified savings products, before tax`}
            source="Official bank pages"
            sourceUrl="/banks"
            updated={`Checked ${dateLabel(banks.products[0].verifiedOn)}`}
            status={<StatusTag status="verified-manual" extra="promos excluded" />}
          >
            <AnimatedNumber value={savingsBaseRange.min} format={(n) => `${n.toFixed(1)}`} />
            –<AnimatedNumber value={savingsBaseRange.max} format={(n) => `${n.toFixed(2)}%`} />
          </Indicator>
        </ul>
      </section>
    </header>
  )
}
