/*
 * PinansyalPH (https://pinansyalph.site/)
 * Copyright (c) 2026 Jervil Angelo De Leon. All rights reserved.
 *
 * This source code is proprietary to its author. Copying,
 * reproducing, modifying, distributing, publishing or reusing it, in whole or
 * in part, without the author's prior written permission is not allowed.
 * See the LICENSE file at the root of this repository.
 */

import { Reveal } from '../ui/motion'
import { AVOID } from './avoidItems'
import { t, tv } from '../../i18n'

/** The six things to avoid: one reason, one real example, one alternative each. */
export function AvoidList() {
  return (
    <section id="avoid" aria-labelledby="avoid-title" className="wrap mt-[clamp(72px,8vw,120px)] scroll-mt-24">
      <h2 id="avoid-title" className="text-step-head">{t("Avoid these")}</h2>
      <ul className="m-0 mt-8 grid list-none gap-4 p-0 md:grid-cols-2" data-testid="avoid-list">
        {AVOID.map((a, i) => (
          <li key={a.id} id={`avoid-${a.id}`} className="flex scroll-mt-24" data-testid="avoid-item">
            <Reveal delay={0.04 * i} className="flex w-full flex-col rounded-[24px] bg-paper p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-alarm text-white">
                  <a.icon size={22} strokeWidth={2.1} />
                </span>
                <h3 className="serif text-[1.375rem] leading-tight tracking-[-0.01em]">{tv(a.title)}</h3>
              </div>
              <p className="mt-3 text-[1rem] leading-relaxed text-ink-2">{tv(a.why)}</p>
              <p className="mt-3 rounded-[14px] bg-alarm-soft px-4 py-3 text-[0.9375rem] leading-relaxed text-alarm-deep" data-testid={`avoid-${a.id}-example`}>
                {tv(a.example)}
              </p>
              <p className="mt-3 text-[0.9375rem] leading-relaxed">
                <span className="font-semibold text-gain">{t("Instead:")}{' '}</span>
                {tv(a.instead)}
              </p>
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  )
}
