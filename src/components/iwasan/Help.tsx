/*
 * PinansyalPH (https://pinansyalph.site/)
 * Copyright (c) 2026 Jervil Angelo De Leon. All rights reserved.
 *
 * This source code is proprietary to its author. Copying,
 * reproducing, modifying, distributing, publishing or reusing it, in whole or
 * in part, without the author's prior written permission is not allowed.
 * See the LICENSE file at the root of this repository.
 */

import { LifeBuoy } from 'lucide-react'
import { IWASAN_SOURCES } from '../../data/iwasanSources'
import { dateLabel } from '../../utils/format'
import { Disclosure } from '../ui/Disclosure'
import { Cite } from './shared'
import { tx } from '../../i18n/react'
import { t, tv } from '../../i18n'

const HARD: { title: string; body: string; cite: string }[] = [
  { title: 'Losses hurt more than wins feel good', body: 'So people keep playing to win back what they lost.', cite: 'kahneman-tversky-1979' },
  { title: 'Almost winning feels like winning', body: 'A near-miss makes people want to play again, though it pays nothing.', cite: 'clark-2009' },
  { title: 'Now beats later', body: 'Having something today feels worth more than it is, so fees and interest seem small.', cite: 'laibson-1997' },
  { title: 'The minimum sets the anchor', body: 'Seeing a minimum payment makes people pay less than they would otherwise.', cite: 'stewart-2009' },
]

/** Why these traps work, and where to get help. */
export function WhyAndHelp() {
  return (
    <section id="help" aria-labelledby="hard-title" className="wrap mt-[clamp(72px,8vw,120px)] scroll-mt-24">
      <div className="grid gap-10 lg:grid-cols-2">
        <div>
          <h2 id="hard-title" className="text-step-head">{t("Why it’s hard to stop")}</h2>
          <ul className="m-0 mt-6 grid list-none gap-4 p-0" data-testid="why-hard">
            {HARD.map((h) => (
              <li key={h.title}>
                <p className="serif text-[1.25rem] leading-tight">
                  {tv(h.title)}
                  <Cite id={h.cite} />
                </p>
                <p className="mt-1 text-[1rem] leading-relaxed text-ink-2">{tv(h.body)}</p>
              </li>
            ))}
          </ul>
          <p className="ui mt-5 text-[0.9375rem] text-muted">{t("These are normal ways everyone’s brain works. Knowing them makes them easier to resist.")}</p>
        </div>
        <div className="rounded-[28px] bg-gain-soft p-6 sm:p-8" data-testid="get-help">
          <h2 className="flex items-center gap-3 text-[clamp(1.75rem,1.4rem+1vw,2.25rem)] leading-tight">
            <LifeBuoy aria-hidden="true" size={28} className="text-gain" />{t("Where to get help")}</h2>
          <ul className="m-0 mt-5 grid list-none gap-4 p-0 text-[1rem] leading-relaxed">
            <li>
              <strong className="font-semibold">{t("Can’t stop gambling:")}</strong>{' '}{t("PAGCOR lets you, or your spouse, child or parent, request exclusion from licensed gaming sites.")}<Cite id="pagcor-exclusion" />
            </li>
            <li>
              <strong className="font-semibold">{t("Loan app harassment:")}</strong>{' '}{t("lenders may not contact people in your phone besides the references you chose. Report it to the National Privacy Commission or the SEC.")}<Cite id="npc-2022-02" />
              <Cite id="sec-mc18-2019" />
            </li>
            <li>
              <strong className="font-semibold">{t("Bank or credit card problem:")}</strong>{' '}{t("complain to the bank first; if unresolved, contact the BSP through its BSP Online Buddy chatbot.")}<Cite id="bsp-cam" />
            </li>
          </ul>
          <p className="ui mt-5 text-[0.875rem] text-ink-2">{t("If you’re already in debt, you’re not alone, and it’s not too late. Start with one payment plan.")}</p>
        </div>
      </div>

      <div className="mt-12" id="sources">
        <Disclosure title={t("Sources ({length})", { length: IWASAN_SOURCES.length })} id="iwasan-sources-list">
          <ol className="m-0 grid list-none gap-0 p-0" data-testid="iwasan-sources">
            {IWASAN_SOURCES.map((s, i) => (
              <li key={s.id} id={`src-${s.id}`} className="grid scroll-mt-28 gap-1 border-t border-line py-3 first:border-t-0 sm:grid-cols-[2.5rem_minmax(0,1fr)]">
                <span className="figure text-muted">[{i + 1}]</span>
                <div className="min-w-0">
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-accent underline underline-offset-2 [overflow-wrap:anywhere]">
                    {tv(s.title)}
                  </a>
                  <p className="ui mt-1 text-[0.875rem] text-ink-2">
                    {s.org} · {s.date} · {s.supports}
                  </p>
                  <p className="ui mt-0.5 text-[0.8125rem] text-muted">{tx("{v0} · checked {verified}", { v0: (s.status === 'read' ? t("Document read") : s.status === 'crossref' ? t("Details checked with Crossref") : t("Site refused automated reading; cited for its title only")), verified: (dateLabel(s.verified)), })}</p>
                </div>
              </li>
            ))}
          </ol>
        </Disclosure>
        <p className="ui mt-4 text-[0.875rem] text-muted">{t("For learning, not legal or financial advice. Rules change: check with the agency for the latest.")}</p>
      </div>
    </section>
  )
}
