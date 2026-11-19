import { ArrowDown, ShieldAlert } from 'lucide-react'
import { AvoidList } from '../components/iwasan/AvoidList'
import { AVOID } from '../components/iwasan/avoidItems'
import { Calculators } from '../components/iwasan/Calculators'
import { WhyAndHelp } from '../components/iwasan/Help'
import { Page } from '../components/layout/Page'
import { SplitWords, motion, useEnter } from '../components/ui/motion'
import { t, tv } from '../i18n'

function Hero() {
  const enter = useEnter()
  return (
    <header className="wrap pt-6 sm:pt-10">
      <div className="grid gap-8 rounded-[32px] bg-alarm-deep p-6 text-white sm:p-10 lg:grid-cols-12 lg:items-end lg:p-14" data-testid="iwasan-hero">
        <div className="lg:col-span-7">
          <ShieldAlert aria-hidden="true" size={44} strokeWidth={1.8} className="text-[#ffb4a8]" />
          <h1 className="mt-4 text-[clamp(3rem,1.8rem+4.6vw,5.5rem)] leading-[0.95] tracking-[-0.035em]">
            <SplitWords text={t("Mga Dapat Iwasan")} delay={0.2} />
          </h1>
          <motion.p {...enter(0.45)} className="serif mt-5 max-w-[22ch] text-[clamp(1.5rem,1.2rem+1.2vw,2.125rem)] leading-[1.15] tracking-[-0.01em]">{t("Money traps that quietly drain your wallet.")}</motion.p>
          <motion.p {...enter(0.55)} className="mt-4 max-w-[46ch] text-[1.0625rem] leading-relaxed text-white/85">{t("Six things to avoid, why they cost you, and what to do instead. With calculators to check your own numbers.")}</motion.p>
        </div>
        <motion.nav {...enter(0.35)} aria-label={t("Things to avoid")} className="lg:col-span-5">
          <ul className="ui m-0 grid list-none gap-2 p-0">
            {AVOID.map((a) => (
              <li key={a.id}>
                <a
                  href={`#avoid-${a.id}`}
                  className="group flex items-center gap-3 rounded-[16px] bg-white/10 px-4 py-3 font-semibold transition-colors hover:bg-white hover:text-alarm-deep"
                  data-testid="iwasan-entry"
                >
                  <a.icon aria-hidden="true" size={20} className="shrink-0" />
                  <span className="flex-1">{tv(a.title)}</span>
                  <ArrowDown aria-hidden="true" size={16} className="opacity-70 transition-transform group-hover:translate-y-0.5" />
                </a>
              </li>
            ))}
          </ul>
        </motion.nav>
      </div>
    </header>
  )
}

/** Its own chunk: the calculators and sources load only on this page. */
export const IwasanPage = () => (
  <Page
    path="/mga-dapat-iwasan"
    title={t("Mga Dapat Iwasan")}
    description={t("Money traps to avoid: betting sites, online loan apps, borrowing to pay loans, credit card minimums, stacked installments and impulse buys. With simple calculators.")}
    next={false}
  >
    <Hero />
    <AvoidList />
    <Calculators />
    <WhyAndHelp />
  </Page>
)
