import { ArrowUp } from 'lucide-react'
import credits from '../../../docs/image-credits.json'
import { GROUPS, Link, TOOLS } from '../../router'
import { AUTHOR, PORTFOLIO, REPO, TAGLINE, VERSION } from '../../site'
import { Wordmark } from '../brand/Logo'
import { SunMark } from '../ui/Result'
import { useSupport } from '../support/Support'

const SOURCES = [
  { label: 'Philippine Statistics Authority', href: 'https://openstat.psa.gov.ph/' },
  { label: 'DOE Oil Monitor', href: 'https://doe.gov.ph/data-and-prices/liquid-fuels/oil-monitor' },
  { label: 'Pag-IBIG Fund MP2', href: 'https://www.pagibigfund.gov.ph/mp2.html' },
  { label: 'BIR, SSS, PhilHealth, Pag-IBIG contribution tables', href: `${REPO}/blob/main/docs/METHODOLOGY.md` },
]

type Credit = { title: string; creator: string; license: string; licenseUrl: string; page: string; file: string }
const USED = ['jeepney', 'peso', 'petron']

export function Footer() {
  const { openSupport } = useSupport()
  const list = (credits as Credit[]).filter((c) => USED.some((u) => c.file.toLowerCase().includes(u)))
  const col = 'ui m-0 mt-4 grid list-none gap-2.5 p-0 text-[0.9375rem]'
  const head = 'ui text-[0.875rem] font-semibold tracking-normal text-muted'

  return (
    <footer className="mt-[clamp(96px,10vw,160px)] bg-surface">
      <div className="wrap pt-14 pb-10 sm:pt-20">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Wordmark height={40} />
            <p className="serif mt-5 text-[1.5rem] leading-snug tracking-[-0.015em]">{TAGLINE}</p>
            <p className="mt-3 max-w-[38ch] text-ink-2">Free money calculators for Filipinos, built on official Philippine data. Your numbers stay on your device.</p>
            <button type="button" onClick={openSupport} className="btn btn-paper mt-6">
              <SunMark />
              Support PinansyalPH
            </button>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:col-span-8">
            {GROUPS.map((g) => (
              <div key={g.id}>
                <h2 className={head}>{g.label}</h2>
                <ul className={col}>
                  {TOOLS.filter((t) => t.group === g.id).map((t) => (
                    <li key={t.path}>
                      <Link className="link" to={t.path}>
                        {t.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div>
              <h2 className={head}>Project</h2>
              <ul className={col}>
                <li>
                  <Link className="link" to="/about">
                    About PinansyalPH
                  </Link>
                </li>
                <li>
                  <Link className="link font-semibold text-alarm" to="/mga-dapat-iwasan">
                    Mga Dapat Iwasan
                  </Link>
                </li>
                <li>
                  <a className="link" href={REPO} target="_blank" rel="noopener noreferrer">
                    Source code on GitHub
                  </a>
                </li>
                <li>
                  <a className="link" href={`${REPO}/blob/main/docs/METHODOLOGY.md`} target="_blank" rel="noopener noreferrer">
                    Methodology
                  </a>
                </li>
                <li>
                  <a className="link" href={`${REPO}/issues`} target="_blank" rel="noopener noreferrer">
                    Report an issue
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h2 className={head}>Official sources</h2>
              <ul className={col}>
                {SOURCES.map((s) => (
                  <li key={s.label}>
                    <a className="link" href={s.href} target="_blank" rel="noopener noreferrer">
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className={head}>Photographs</h2>
              <ul className="ui m-0 mt-4 grid list-none gap-2.5 p-0 text-[0.8125rem] leading-snug text-muted">
                {list.map((c) => (
                  <li key={c.page}>
                    <a className="link" href={c.page} target="_blank" rel="noopener noreferrer">
                      {c.title}
                    </a>{' '}
                    by {c.creator},{' '}
                    <a className="link" href={c.licenseUrl} target="_blank" rel="noopener noreferrer">
                      {c.license}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="ui mt-16 grid gap-6 rounded-[22px] bg-ground p-5 text-[0.875rem] leading-relaxed text-ink-2 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <p className="max-w-[78ch]">
            Educational tool, not financial advice. Projections use published data and your assumptions, and are not actual earnings. Not affiliated
            with PSA, DOE, BIR, SSS, PhilHealth, Pag-IBIG Fund or any bank. No sign-up, no ads, no tracking.
          </p>
          <button type="button" className="btn btn-paper btn-sm justify-self-start" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <ArrowUp aria-hidden="true" size={16} /> Back to top
          </button>
        </div>

        <div className="ui mt-6 flex flex-col gap-2 text-[0.875rem] text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            PinansyalPH v{VERSION} · Source code public on GitHub
          </p>
          <p>
            Made by{' '}
            <a className="link text-ink-2" href={PORTFOLIO} target="_blank" rel="noopener noreferrer">
              {AUTHOR}
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
