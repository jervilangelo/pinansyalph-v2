import { ArrowDown, CreditCard, Dices, HandCoins, ShieldAlert } from 'lucide-react'
import { CardSection } from '../components/iwasan/CardSection'
import { GamblingSection } from '../components/iwasan/GamblingSection'
import { LoanSection } from '../components/iwasan/LoanSection'
import { InstallmentSection, PsychologySection, ProtectSection, SavingsSection, SourcesSection } from '../components/iwasan/MoreSections'
import { Page } from '../components/layout/Page'
import { SplitWords, motion, useEnter } from '../components/ui/motion'

const ENTRIES = [
  { href: '#sugal', icon: Dices, title: 'Gambling', line: 'Ang laro ay pabor sa bahay', body: 'House edge, expected loss and why some people win anyway.' },
  { href: '#utang', icon: HandCoins, title: 'Loan apps', line: 'Ang siklo ng utang', body: 'What a quick loan really costs, and what borrowing again does.' },
  { href: '#credit-card', icon: CreditCard, title: 'Credit cards', line: 'Ang bitag ng minimum payment', body: 'How long the minimum takes, and what it costs.' },
]

const JUMPS = [
  ['#sugal', 'Sugal'],
  ['#utang', 'Loan apps'],
  ['#credit-card', 'Credit cards'],
  ['#installment', 'Installments'],
  ['#psychology', 'Bakit ang hirap tumigil?'],
  ['#kung-inipon', 'Kung inipon mo sana'],
  ['#protektahan', 'Protektahan ang pera mo'],
  ['#sources', 'Sources'],
] as const

function Hero() {
  const enter = useEnter()
  return (
    <header className="wrap pt-6 sm:pt-10">
      <div className="relative overflow-hidden rounded-[32px] bg-alarm-deep text-white" data-testid="iwasan-hero">
        <div className="grid gap-10 p-6 sm:p-10 lg:grid-cols-12 lg:gap-12 lg:p-14">
          <div className="lg:col-span-6">
            <ShieldAlert aria-hidden="true" size={44} strokeWidth={1.8} className="text-[#ffb4a8]" />
            <h1 className="mt-4 text-[clamp(3rem,1.8rem+4.6vw,5.5rem)] leading-[0.95] tracking-[-0.035em]">
              <SplitWords text="Mga Dapat Iwasan" delay={0.2} />
            </h1>
            <motion.p {...enter(0.45)} className="serif mt-6 max-w-[24ch] text-[clamp(1.375rem,1.1rem+1vw,1.875rem)] leading-[1.2] tracking-[-0.01em]">
              Kilalanin ang mga financial traps bago pa maubos ang pera mo.
            </motion.p>
            <motion.p {...enter(0.55)} className="mt-5 max-w-[52ch] text-[1.0625rem] leading-relaxed text-white/85">
              May mga bagay na mukhang madaling pagkakakitaan o convenient sa simula, pero maaaring magdulot ng malaking financial problems. Alamin ang mechanics sa likod ng gambling, utang, credit
              cards, at excessive spending.
            </motion.p>
            <motion.p {...enter(0.65)} className="ui mt-5 text-[0.9375rem] text-white/70">
              Not everything that promises easy money is good for your financial future.
            </motion.p>
          </div>
          <motion.ul {...enter(0.35)} className="m-0 grid list-none content-center gap-3 p-0 lg:col-span-6" aria-label="Start here">
            {ENTRIES.map((e) => (
              <li key={e.href}>
                <a
                  href={e.href}
                  className="group flex items-center gap-4 rounded-[22px] bg-white p-4 text-ink transition-[transform,background-color] duration-300 ease-[var(--ease-out-quint)] hover:-translate-y-0.5 hover:bg-alarm-soft sm:p-5"
                  data-testid="iwasan-entry"
                >
                  <span aria-hidden="true" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[16px] bg-alarm text-white transition-transform duration-300 group-hover:-rotate-6">
                    <e.icon size={28} strokeWidth={2} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="ui block text-[0.875rem] font-semibold text-alarm">{e.title}</span>
                    <span className="serif block text-[1.375rem] leading-tight tracking-[-0.01em]">{e.line}</span>
                    <span className="ui mt-0.5 block text-[0.875rem] text-ink-2">{e.body}</span>
                  </span>
                  <ArrowDown aria-hidden="true" size={20} className="shrink-0 text-muted transition-transform duration-300 group-hover:translate-y-0.5 group-hover:text-alarm" />
                </a>
              </li>
            ))}
          </motion.ul>
        </div>
      </div>
      <nav aria-label="On this page" className="mt-5">
        <ul className="ui m-0 flex list-none flex-wrap gap-2 p-0">
          {JUMPS.map(([href, label]) => (
            <li key={href}>
              <a href={href} className="block rounded-full bg-paper px-3.5 py-2 text-[0.9375rem] font-medium text-ink-2 transition-colors hover:bg-alarm-soft hover:text-alarm-deep">
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  )
}

/** Its own chunk: the simulators and sources load only on this page. */
export const IwasanPage = () => (
  <Page
    path="/mga-dapat-iwasan"
    title="Mga Dapat Iwasan"
    description="Alamin ang financial risks ng gambling, loan apps, credit cards, at excessive spending. Gumamit ng interactive financial simulators at matutong protektahan ang iyong pera."
    next={false}
  >
    <Hero />
    <GamblingSection />
    <LoanSection />
    <CardSection />
    <InstallmentSection />
    <PsychologySection />
    <SavingsSection />
    <ProtectSection />
    <SourcesSection />
  </Page>
)
