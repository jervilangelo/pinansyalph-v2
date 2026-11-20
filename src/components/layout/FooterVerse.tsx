/*
 * PinansyalPH (https://pinansyalph.site/)
 * Copyright (c) 2026 Jervil Angelo De Leon. All rights reserved.
 *
 * This source code is proprietary to its author. Copying,
 * reproducing, modifying, distributing, publishing or reusing it, in whole or
 * in part, without the author's prior written permission is not allowed.
 * See the LICENSE file at the root of this repository.
 */

import { Pause, Play } from 'lucide-react'
import { useEffect, useState } from 'react'
import { t } from '../../i18n'

/** Bible verses (ESV), shown one at a time in the footer. Quoted as written, never translated. */
const VERSES: { ref: string; lines: string[] }[] = [
  {
    ref: 'Proverbs 21:5',
    lines: ['The plans of the diligent lead surely to abundance,', 'but everyone who is hasty comes only to poverty.'],
  },
  {
    ref: 'Colossians 3:23',
    lines: ['Whatever you do, work heartily, as for the Lord and not for men,'],
  },
  {
    ref: 'Hebrews 13:5',
    lines: ['Keep your life free from love of money, and be content with what you have, for he has said, “I will never leave you nor forsake you.”'],
  },
]

/** How long each verse stays before the next one fades in. */
const VERSE_INTERVAL_MS = 9000

/**
 * One verse at a time, cross-fading to the next. All verses sit in the same grid cell, so the
 * block always has the height of the longest one and the footer never jumps. Rotation pauses
 * while the pointer or keyboard focus is on it, while the tab is hidden, and when the visitor
 * presses pause (auto-moving content must be pausable).
 */
export function FooterVerse() {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [hold, setHold] = useState(false)
  const [hidden, setHidden] = useState(() => typeof document !== 'undefined' && document.hidden)

  useEffect(() => {
    const onVis = () => setHidden(document.hidden)
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  useEffect(() => {
    if (paused || hold || hidden) return
    const id = window.setTimeout(() => setIndex((i) => (i + 1) % VERSES.length), VERSE_INTERVAL_MS)
    return () => window.clearTimeout(id)
  }, [index, paused, hold, hidden])

  return (
    <figure
      className="m-0 mt-16 border-y border-line py-10 text-center sm:py-12"
      aria-label={t('Bible verses')}
      data-testid="footer-verse"
      onMouseEnter={() => setHold(true)}
      onMouseLeave={() => setHold(false)}
      onFocus={() => setHold(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHold(false)
      }}
    >
      <div className="grid">
        {VERSES.map((v, i) => {
          const on = i === index
          return (
            <div
              key={v.ref}
              aria-hidden={!on}
              data-active={on || undefined}
              className={`col-start-1 row-start-1 mx-auto self-center max-w-[60ch] transition-[opacity,transform,filter] duration-[900ms] ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transform-none motion-reduce:blur-none ${
                on ? 'opacity-100 blur-0 translate-y-0' : 'pointer-events-none opacity-0 blur-[3px] translate-y-2'
              }`}
            >
              <blockquote className="serif m-0 text-[clamp(1.125rem,1rem+0.6vw,1.375rem)] leading-relaxed tracking-[-0.01em] text-ink italic">
                {v.lines.map((l) => (
                  <span key={l} className="block text-balance">
                    {l}
                  </span>
                ))}
              </blockquote>
              <figcaption className="ui mt-4 text-[0.875rem] font-semibold tracking-wide text-accent">{v.ref}</figcaption>
            </div>
          )
        })}
      </div>

      <div className="ui mt-6 flex items-center justify-center gap-1">
        {VERSES.map((v, i) => (
          <button
            key={v.ref}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={v.ref}
            aria-current={i === index || undefined}
            className="grid size-8 cursor-pointer place-items-center rounded-full border-0 bg-transparent p-0"
          >
            <span
              aria-hidden="true"
              className={`block h-1.5 rounded-full transition-all duration-500 ${i === index ? 'w-5 bg-accent' : 'w-1.5 bg-muted/40'}`}
            />
          </button>
        ))}
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-label={paused ? t('Play verses') : t('Pause verses')}
          aria-pressed={paused}
          data-testid="verse-toggle"
          className="ml-1 grid size-8 cursor-pointer place-items-center rounded-full border-0 bg-transparent p-0 text-muted transition-colors hover:bg-ground hover:text-ink"
        >
          {paused ? <Play aria-hidden="true" size={14} /> : <Pause aria-hidden="true" size={14} />}
        </button>
      </div>
    </figure>
  )
}
