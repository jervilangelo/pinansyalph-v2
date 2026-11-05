import credits from '../../../docs/image-credits.json'
import { Link, PAGES } from '../../router'
import { REPO } from '../../site'

const SOURCES = [
  { label: 'Philippine Statistics Authority', href: 'https://openstat.psa.gov.ph/' },
  { label: 'DOE Oil Monitor', href: 'https://doe.gov.ph/data-and-prices/liquid-fuels/oil-monitor' },
  { label: 'Pag-IBIG Fund MP2', href: 'https://www.pagibigfund.gov.ph/mp2.html' },
]

type Credit = { title: string; creator: string; license: string; licenseUrl: string; page: string; file: string }
const USED = ['jeepney', 'peso', 'danao', 'petron']

export function Footer() {
  const list = (credits as Credit[]).filter((c) => USED.some((u) => c.file.toLowerCase().includes(u)))
  return (
    <footer className="on-dark mt-[clamp(96px,10vw,180px)] overflow-hidden bg-night text-night-ink">
      <div className="wrap pt-16">
        <p aria-hidden="true" className="-mb-[0.18em] text-[clamp(3.2rem,10.6vw,11rem)] leading-[0.95] font-medium tracking-[-0.045em] whitespace-nowrap">
          PinansyalPH
        </p>
      </div>
      <div className="wrap grid gap-12 pt-20 md:grid-cols-12">
        <div className="md:col-span-5">
          <h2 className="ui text-[0.9375rem] font-semibold text-night-muted">Official sources</h2>
          <ul className="m-0 mt-4 grid list-none gap-2 p-0">
            {SOURCES.map((s) => (
              <li key={s.href}>
                <a className="link text-[clamp(1.375rem,1.1rem+0.9vw,2rem)] leading-tight" href={s.href} target="_blank" rel="noreferrer">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div className="ui grid gap-10 text-[0.9375rem] sm:grid-cols-3 md:col-span-7">
          <div>
            <h2 className="text-[0.9375rem] font-semibold text-night-muted">Pages</h2>
            <ul className="m-0 mt-3 grid list-none gap-2 p-0">
              <li>
                <Link className="link" to="/">
                  Home
                </Link>
              </li>
              {PAGES.map((n) => (
                <li key={n.path}>
                  <Link className="link" to={n.path}>
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-[0.9375rem] font-semibold text-night-muted">Project</h2>
            <ul className="m-0 mt-3 grid list-none gap-2 p-0">
              <li>
                <a className="link" href={REPO}>
                  Source code on GitHub
                </a>
              </li>
              <li>
                <a className="link" href={`${REPO}/issues`}>
                  Report an issue
                </a>
              </li>
              <li>
                <a className="link" href={`${REPO}/blob/main/docs/METHODOLOGY.md`}>
                  Methodology
                </a>
              </li>
              <li>
                <a className="link" href={`${REPO}/tree/main/src/data`}>
                  Datasets
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h2 className="text-[0.9375rem] font-semibold text-night-muted">Photographs</h2>
            <ul className="m-0 mt-3 grid list-none gap-2 p-0 text-[0.8125rem] leading-snug text-night-muted">
              {list.map((c) => (
                <li key={c.page}>
                  <a className="link" href={c.page}>
                    {c.title}
                  </a>{' '}
                  by {c.creator},{' '}
                  <a className="link" href={c.licenseUrl}>
                    {c.license}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <div className="wrap ui flex flex-col gap-4 pt-24 pb-10 text-[0.875rem] text-night-muted sm:flex-row sm:items-end sm:justify-between">
        <p className="max-w-[70ch]">
          Educational tool, not financial advice. Projections use published data and your assumptions and are not actual
          earnings. Not affiliated with PSA, DOE, Pag-IBIG Fund or any bank. Free, open source, no sign-up, no tracking.
        </p>
        <button type="button" className="link shrink-0 cursor-pointer border-0 bg-transparent p-0 text-left text-night-ink" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          Back to top
        </button>
      </div>
    </footer>
  )
}
