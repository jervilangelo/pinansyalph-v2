import { basePurchasingPowerYear, latestPurchasingPower, recentAverageInflation } from '../../data'
import { monthLabel } from '../../utils/format'
import { AnimatedNumber, Reveal } from '../ui/motion'

const BASE = import.meta.env.BASE_URL

/**
 * The idea of the page, from PSA's own table: the purchasing power of the peso.
 */
export function Intro() {
  const centavos = Math.round(latestPurchasingPower.value * 100)
  return (
    <section aria-labelledby="intro-title" className="mt-[clamp(96px,12vw,200px)] px-[var(--gutter)]">
      <div className="grid gap-2 md:grid-cols-12 md:grid-rows-[minmax(240px,38svh)_minmax(240px,38svh)]">
        <Reveal className="on-dark flex flex-col justify-end bg-night p-5 text-night-ink md:col-span-8 md:row-span-2 md:p-8">
          <h2 id="intro-title" className="text-[clamp(2.75rem,8.5vw,8.25rem)] leading-[0.9] tracking-[-0.04em]">
            Your peso from {basePurchasingPowerYear}
          </h2>
        </Reveal>
        <Reveal delay={0.08} className="flex flex-col justify-between overflow-hidden bg-surface p-5 md:col-span-4 md:p-8">
          <p className="tabular text-[clamp(4.5rem,9vw,8.25rem)] leading-[0.9] font-medium tracking-[-0.04em]">
            <AnimatedNumber value={centavos} format={(n) => `${Math.round(n)}¢`} duration={1.2} />
          </p>
          <p className="mt-6 text-[1.25rem] leading-snug">
            is all it buys now.
            <span className="ui block pt-2 text-[0.875rem] text-ink-2">
              PSA purchasing power of the peso, {monthLabel(latestPurchasingPower.period)} ({basePurchasingPowerYear} = ₱1.00)
            </span>
          </p>
        </Reveal>
        <Reveal delay={0.16} as="figure" className="relative m-0 min-h-[240px] overflow-hidden bg-surface-2 md:col-span-4">
          <img
            src={`${BASE}images/palengke-800.webp`}
            srcSet={`${BASE}images/palengke-800.webp 800w, ${BASE}images/palengke-1400.webp 1400w`}
            sizes="(min-width: 768px) 33vw, 100vw"
            width={800}
            height={611}
            loading="lazy"
            alt="Vegetables and bananas piled high at a public market stall"
            className="photo-mono absolute inset-0 h-full w-full object-cover"
          />
          <figcaption className="ui absolute bottom-0 left-0 bg-ground/90 px-3 py-1.5 text-[0.8125rem]">Palengke, Danao City</figcaption>
        </Reveal>
      </div>
      <div className="mt-2 grid bg-paper p-5 md:grid-cols-12 md:p-10">
        <Reveal delay={0.1} className="md:col-span-6 md:col-start-7">
          <p className="text-[clamp(1.1875rem,1rem+0.6vw,1.5rem)] leading-[1.45]">
            Prices rise a little every month, so the same peso buys a little less. Over the last five full years Philippine
            inflation averaged {recentAverageInflation.value}% a year. A savings account that pays 3% while prices rise 4% grows
            in pesos and shrinks in what it can buy. This site does that arithmetic for you with official data, so you can see
            whether your MP2 dividends or bank interest actually stay ahead, and by how much.
          </p>
        </Reveal>
      </div>
    </section>
  )
}
