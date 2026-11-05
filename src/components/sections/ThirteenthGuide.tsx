import { AnimatePresence } from 'motion/react'
import { ArrowRight, ChevronDown } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { calculateMp2 } from '../../calculators/mp2'
import { calculateSavings } from '../../calculators/savings'
import { banks, latestMp2, productById, recentAverageInflation } from '../../data'
import { safe, type ScenarioState } from '../../hooks/useScenario'
import { useRouter } from '../../router'
import { peso, pesoExact } from '../../utils/format'
import { NumberField } from '../ui/fields'
import { EASE, Reveal, motion, useReducedMotion } from '../ui/motion'

export const SOURCES = [
  { label: 'Presidential Decree No. 851 (13th Month Pay Law)', href: 'https://lawphil.net/statutes/presdecs/pd1975/pd_851_1975.html' },
  { label: 'DOLE Labor Advisory No. 16, Series of 2025 (DOLE issuances)', href: 'https://www.dole.gov.ph/' },
  { label: 'DOLE Bureau of Working Conditions: Handbook on Workers’ Statutory Monetary Benefits', href: 'https://bwc.dole.gov.ph/' },
  { label: 'RA 10963 (TRAIN Law): ₱90,000 exemption', href: 'https://lawphil.net/statutes/repacts/ra2017/ra_10963_2017.html' },
  { label: 'BIR: TRAIN Law information', href: 'https://www.bir.gov.ph/index.php/train.html' },
  { label: 'BIR Revenue Regulations No. 11-2018', href: 'https://www.bir.gov.ph/revenue-regulations' },
  { label: 'RA 11210 (105-Day Expanded Maternity Leave Law)', href: 'https://lawphil.net/statutes/repacts/ra2019/ra_11210_2019.html' },
]

const QA: { q: string; a: ReactNode }[] = [
  {
    q: 'Ano ang 13th month pay?',
    a: 'Ito ay dagdag na bayad na required ng batas (PD 851) para sa rank-and-file employees sa private sector. Hindi ito regalo o bonus ng kumpanya: karapatan mo ito kapag nagtrabaho ka nang kahit isang buwan sa loob ng taon.',
  },
  {
    q: 'Sino ang qualified?',
    a: 'Lahat ng rank-and-file employees sa private sector, regular man, probationary, contractual o casual, basta nakapagtrabaho ng at least one month sa calendar year, anuman ang paraan ng pagbayad sa iyo. Covered din ang kasambahay sa ilalim ng RA 10361. Ang government employees ay may sariling year-end bonus, at ang managerial employees ay hindi covered ng PD 851, pero puwedeng may benefit sila base sa kontrata o company policy.',
  },
  {
    q: 'Paano ito kinukuwenta?',
    a: 'Total basic salary na kinita mo sa buong taon ÷ 12. Basic salary lang: hindi kasama ang overtime, night differential, holiday at premium pay, COLA, allowances at cash conversion ng unused leave, maliban kung sinasabi ng kontrata, CBA o company practice na kasama sila.',
  },
  {
    q: 'Bakit prorated ang sa akin?',
    a: 'Dahil ang batayan ay ang salary na aktwal mong kinita sa taon. Kung na-hire ka midyear, nag-resign, o nagbago ang sweldo mo, ang mga buwang iyon lang ang bibilangin, sa rate na binayaran sa iyo noon.',
  },
  {
    q: 'Paano kung nag-resign ako?',
    a: 'May karapatan ka pa rin sa proportionate 13th month pay: ang basic salary mo mula January (o mula nang ma-hire ka) hanggang sa huling araw mo, ÷ 12. Kadalasan kasama ito sa final pay.',
  },
  {
    q: 'Nakakabawas ba ang unpaid absences?',
    a: 'Oo. Ang leave without pay, tardiness o undertime na ibinawas sa sweldo mo ay hindi bahagi ng “basic salary earned”, kaya bumababa rin ang 13th month pay. Ang paid leave, gaya ng paid vacation o sick leave, ay hindi nakakabawas dahil binayaran ka pa rin.',
  },
  {
    q: 'Taxable ba ito?',
    a: 'Tax-free ang 13th month pay at iba pang benefits hanggang ₱90,000 combined bawat taon. Ang sobra lang ang isasama sa taxable income mo at ita-tax sa regular na graduated rate.',
  },
  {
    q: 'Iba ba ito sa Christmas bonus?',
    a: 'Oo. Required ng batas ang 13th month pay. Ang Christmas bonus ay depende sa kumpanya, maliban kung nakasulat sa kontrata o CBA, o naging regular na practice na. Pero ang dalawa ay share sa iisang ₱90,000 tax exemption.',
  },
  {
    q: 'Kailan dapat ibigay?',
    a: 'On or before December 24 ng bawat taon. Puwedeng hatiin ng employer (halimbawa, kalahati sa June at kalahati sa December), pero kailangang buo na ito bago mag-December 24. Ang resigned employees ay binabayaran kasama ng final pay.',
  },
  {
    q: 'Saan ako puwedeng humingi ng tulong?',
    a: (
      <>
        Kausapin muna ang HR o payroll. Kung hindi naayos, lumapit sa pinakamalapit na DOLE Regional o Field Office, o tumawag sa DOLE Hotline 1349.
        Puwede ring mag-file ng Request for Assistance sa Single Entry Approach (SEnA).
      </>
    ),
  },
]

function Faq({ item, i }: { item: (typeof QA)[number]; i: number }) {
  const [open, setOpen] = useState(i === 0)
  const reduce = useReducedMotion()
  return (
    <li className="border-t border-surface-2 last:border-b">
      <h3 className="m-0 text-[clamp(1.25rem,1.1rem+0.6vw,1.625rem)] leading-tight">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex w-full cursor-pointer items-center justify-between gap-4 border-0 bg-transparent py-5 text-left font-[inherit] text-[inherit] text-ink transition-colors hover:text-accent"
        >
          {item.q}
          <ChevronDown aria-hidden="true" size={22} className={`shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reduce ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="overflow-hidden"
          >
            <p className="max-w-[62ch] pb-6 text-[1.0625rem] leading-[1.65] text-ink-2">{item.a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  )
}

export function ThirteenthLiteracy() {
  return (
    <section aria-labelledby="literacy-title" className="mt-[clamp(96px,10vw,180px)]">
      <div className="wrap grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <Reveal>
            <h2 id="literacy-title" className="text-step-head">
              Mga Dapat Mong Malaman
            </h2>
            <p className="mt-4 text-ink-2">Ang basics ng 13th month pay, sa simpleng salita.</p>
          </Reveal>
          <Reveal delay={0.08} className="ui mt-10">
            <h3 className="text-[0.9375rem] font-semibold">Official sources</h3>
            <ul className="m-0 mt-3 grid list-none gap-2 p-0 text-[0.9375rem]">
              {SOURCES.map((s) => (
                <li key={s.href}>
                  <a className="link" href={s.href} target="_blank" rel="noreferrer">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
        <ul className="m-0 list-none p-0 lg:col-span-7 lg:col-start-6">
          {QA.map((item, i) => (
            <Faq key={item.q} item={item} i={i} />
          ))}
        </ul>
      </div>
    </section>
  )
}

/* ------------------------------ Allocation ------------------------------ */

type Bucket = { key: string; label: string; color: string; pct: number }
const DEFAULT_SPLIT: Bucket[] = [
  { key: 'emergency', label: 'Emergency fund', color: 'var(--color-s3)', pct: 25 },
  { key: 'mp2', label: 'Pag-IBIG MP2', color: 'var(--color-s1)', pct: 20 },
  { key: 'bank', label: 'Digital bank savings', color: 'var(--color-s7)', pct: 15 },
  { key: 'debt', label: 'Debt repayment', color: 'var(--color-s8)', pct: 15 },
  { key: 'christmas', label: 'Christmas budget', color: 'var(--color-s2)', pct: 20 },
  { key: 'other', label: 'Other expenses', color: 'var(--color-s4)', pct: 5 },
]
const YEARS = 5

export function ThirteenthAllocation({ amount, s }: { amount: number; s: ScenarioState }) {
  const [split, setSplit] = useState(DEFAULT_SPLIT)
  const { navigate } = useRouter()
  const reduce = useReducedMotion()
  const total = split.reduce((a, b) => a + b.pct, 0)
  const amt = (key: string) => Math.round(((split.find((b) => b.key === key)?.pct ?? 0) / 100) * amount * 100) / 100
  const mp2Amount = amt('mp2')
  const bankAmount = amt('bank')
  const product = productById(s.bankOpts.productId) ?? banks.products[0]

  // Reuse the site's own MP2 and savings engines: no separate maths here.
  const projections = useMemo(() => {
    const inflationPct = recentAverageInflation.value
    const mp2 = mp2Amount > 0 ? safe(() => calculateMp2({ initial: mp2Amount, contribution: 0, frequency: 'monthly', years: YEARS, startMonth: 1, dividendRatePct: latestMp2.rate, payout: 'compounded', inflationPct })) : null
    const bank = bankAmount > 0 ? safe(() => calculateSavings({ initial: bankAmount, monthly: 0, years: YEARS, product, inflationPct })) : null
    return {
      mp2: mp2?.ok ? mp2.value.maturityValue.toNumber() : null,
      bank: bank?.ok ? bank.value.finalBalance.toNumber() : null,
    }
  }, [mp2Amount, bankAmount, product])

  function open(path: '/mp2' | '/banks', initial: number) {
    s.setScenario((x) => ({ ...x, initial, monthly: 0, years: YEARS }))
    navigate(path)
  }

  if (amount <= 0) return null
  return (
    <section aria-labelledby="allocation-title" className="mt-[clamp(96px,10vw,180px)] px-[var(--gutter)]">
      <div className="bg-surface px-5 py-12 sm:px-8 lg:px-[6%] lg:py-20">
        <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
          <Reveal className="lg:col-span-6">
            <p className="ui text-[0.875rem] font-semibold text-accent">Optional</p>
            <h2 id="allocation-title" className="mt-2 text-[clamp(1.875rem,1.3rem+2vw,3rem)] leading-[1.05]">
              Anong Gagawin Mo Sa 13th Month Pay Mo?
            </h2>
          </Reveal>
          <Reveal delay={0.08} className="lg:col-span-6">
            <p className="text-ink-2">
              Hatiin ang {peso(amount)} bago pa ito dumating. Change the percentages; MP2 and bank figures use the same calculators as their pages.
            </p>
          </Reveal>
        </div>

        <div className="mt-10 flex h-5 overflow-hidden bg-surface-2" role="img" aria-label={split.map((b) => `${b.label} ${b.pct}%`).join(', ')}>
          {split.map((b) => (
            <motion.div key={b.key} className="h-full" style={{ background: b.color }} initial={false} animate={{ width: `${(b.pct / Math.max(total, 100)) * 100}%` }} transition={reduce ? { duration: 0 } : { duration: 0.5, ease: EASE }} />
          ))}
        </div>
        <p className={`ui mt-2 text-[0.875rem] ${total === 100 ? 'text-ink-2' : 'font-semibold text-warn'}`} role="status">
          {total === 100 ? 'All 100% allocated.' : total < 100 ? `${100 - total}% not yet allocated.` : `Over by ${total - 100}%. Lower one of the shares.`}
        </p>

        <ul className="m-0 mt-8 grid list-none gap-2 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {split.map((b, i) => (
            <li key={b.key} className="grid content-between gap-4 bg-paper p-5">
              <div className="flex items-start justify-between gap-3">
                <span className="ui flex items-center gap-2 font-semibold">
                  <span aria-hidden="true" className="h-3 w-3 shrink-0" style={{ background: b.color }} />
                  {b.label}
                </span>
                <span className="tabular text-[1.25rem] font-medium">{pesoExact(amt(b.key))}</span>
              </div>
              <NumberField label={`Share for ${b.label.toLowerCase()}`} value={b.pct} min={0} max={100} step={1} suffix="%" onChange={(v) => setSplit(split.map((x, j) => (j === i ? { ...x, pct: v } : x)))} />
              {b.key === 'mp2' && projections.mp2 != null && (
                <div className="ui text-[0.875rem] text-ink-2">
                  <p>
                    About <strong className="text-ink">{peso(projections.mp2)}</strong> after {YEARS} years at {latestMp2.rate}% ({latestMp2.year} rate, not guaranteed).
                  </p>
                  <button type="button" className="btn btn-quiet group mt-1 min-h-0 px-0 py-1 text-[0.875rem]" onClick={() => open('/mp2', mp2Amount)}>
                    Open in the MP2 calculator <ArrowRight aria-hidden="true" size={16} className="transition-transform group-hover:translate-x-1" />
                  </button>
                </div>
              )}
              {b.key === 'bank' && projections.bank != null && (
                <div className="ui text-[0.875rem] text-ink-2">
                  <p>
                    About <strong className="text-ink">{peso(projections.bank)}</strong> after {YEARS} years in {product.bank} {product.product}, after {banks.tax.ratePct}% tax.
                  </p>
                  <button type="button" className="btn btn-quiet group mt-1 min-h-0 px-0 py-1 text-[0.875rem]" onClick={() => open('/banks', bankAmount)}>
                    Compare digital banks <ArrowRight aria-hidden="true" size={16} className="transition-transform group-hover:translate-x-1" />
                  </button>
                </div>
              )}
              {b.key === 'emergency' && <p className="ui text-[0.875rem] text-ink-2">A common target is three to six months of expenses, kept somewhere you can withdraw quickly.</p>}
              {b.key === 'debt' && <p className="ui text-[0.875rem] text-ink-2">Paying down high-interest debt, like credit cards, often beats any savings rate.</p>}
            </li>
          ))}
        </ul>
        <p className="ui mt-6 text-[0.8125rem] text-muted">Illustration only, not financial advice. Projections assume {recentAverageInflation.value}% inflation and today’s published rates.</p>
      </div>
    </section>
  )
}
