/*
 * PinansyalPH (https://pinansyalph.site/)
 * Copyright (c) 2026 Jervil Angelo De Leon. All rights reserved.
 *
 * This source code is proprietary to its author. Copying,
 * reproducing, modifying, distributing, publishing or reusing it, in whole or
 * in part, without the author's prior written permission is not allowed.
 * See the LICENSE file at the root of this repository.
 */

import { ArrowUp, Settings as SettingsIcon } from 'lucide-react'
import credits from '../../../docs/image-credits.json'
import { GROUPS, Link, TOOLS } from '../../router'
import { AUTHOR, COPYRIGHT, EMAIL, PORTFOLIO, REPO, TAGLINE, VERSION } from '../../site'
import { Wordmark } from '../brand/Logo'
import { SunMark } from '../ui/Result'
import { FooterVerse } from './FooterVerse'
import { useSettings } from '../settings/Settings'
import { useSupport } from '../support/Support'
import { tx } from '../../i18n/react'
import { t, tv } from '../../i18n'

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
  const { openSettings } = useSettings()
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
            <p className="mt-3 max-w-[38ch] text-ink-2">{t("Free money calculators for Filipinos, built on official Philippine data. Your numbers stay on your device.")}</p>
            <button type="button" onClick={openSupport} className="btn btn-paper mt-6">
              <SunMark />{t("Support PinansyalPH")}</button>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:col-span-8">
            {GROUPS.map((g) => (
              <div key={g.id}>
                <h2 className={head}>{tv(g.label)}</h2>
                <ul className={col}>
                  {TOOLS.filter((t) => t.group === g.id).map((t) => (
                    <li key={t.path}>
                      <Link className="link" to={t.path}>
                        {tv(t.name)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div>
              <h2 className={head}>{t("Project")}</h2>
              <ul className={col}>
                <li>
                  <Link className="link" to="/about">{t("About PinansyalPH")}</Link>
                </li>
                <li>
                  <Link className="link font-semibold text-alarm" to="/mga-dapat-iwasan">{t("Mga Dapat Iwasan")}</Link>
                </li>
                <li>
                  <button type="button" onClick={openSettings} className="link inline-flex cursor-pointer items-center gap-1.5 border-0 bg-transparent p-0 text-left font-[inherit] text-[length:inherit] text-ink">
                    <SettingsIcon aria-hidden="true" size={15} />{t("Settings")}</button>
                </li>
                <li>
                  <a className="link" href={`${REPO}/blob/main/docs/METHODOLOGY.md`} target="_blank" rel="noopener noreferrer">{t("Methodology")}</a>
                </li>
                <li>
                  <a className="link" href={`mailto:${EMAIL}`}>{t("Report an issue")}</a>
                </li>
              </ul>
            </div>
            <div>
              <h2 className={head}>{t("Official sources")}</h2>
              <ul className={col}>
                {SOURCES.map((s) => (
                  <li key={s.label}>
                    <a className="link" href={s.href} target="_blank" rel="noopener noreferrer">
                      {tv(s.label)}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className={head}>{t("Photographs")}</h2>
              <ul className="ui m-0 mt-4 grid list-none gap-2.5 p-0 text-[0.8125rem] leading-snug text-muted">
                {list.map((c) => (
                  <li key={c.page}>{tx("{link} by {creator}, {link2}", { link: (<a className="link" href={c.page} target="_blank" rel="noopener noreferrer">
                      {tv(c.title)}
                    </a>), creator: (c.creator), link2: (<a className="link" href={c.licenseUrl} target="_blank" rel="noopener noreferrer">
                      {c.license}
                    </a>), })}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <FooterVerse />

        <div className="ui mt-10 grid gap-6 rounded-[22px] bg-ground p-5 text-[0.875rem] leading-relaxed text-ink-2 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <p className="max-w-[78ch]">{t("Educational tool, not financial advice. Projections use published data and your assumptions, and are not actual earnings. Not affiliated with PSA, DOE, BIR, SSS, PhilHealth, Pag-IBIG Fund or any bank. No sign-up, no ads, no tracking.")}</p>
          <button type="button" className="btn btn-paper btn-sm justify-self-start" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <ArrowUp aria-hidden="true" size={16} />{' '}{t("Back to top")}</button>
        </div>

        <div className="ui mt-6 flex flex-col gap-2 text-[0.875rem] text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            <span data-testid="copyright">{COPYRIGHT}</span> <span className="whitespace-nowrap">{t("· v")}{VERSION}</span>
          </p>
          <p>{tx("Made by {link}", { link: (<a className="link text-ink-2" href={PORTFOLIO} target="_blank" rel="noopener noreferrer">
              {AUTHOR}
            </a>), })}</p>
        </div>
      </div>
    </footer>
  )
}
