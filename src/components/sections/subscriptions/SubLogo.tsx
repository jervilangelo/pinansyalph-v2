/*
 * PinansyalPH (https://pinansyalph.site/)
 * Copyright (c) 2026 Jervil Angelo De Leon. All rights reserved.
 *
 * This source code is proprietary to its author. Copying,
 * reproducing, modifying, distributing, publishing or reusing it, in whole or
 * in part, without the author's prior written permission is not allowed.
 * See the LICENSE file at the root of this repository.
 */

import type { CustomIcon } from '../../../calculators/subscriptions'
import { BRAND_MARKS, type BrandKey } from '../../../data/brandMarks'
import { ICONS, initials } from './icons'

/**
 * A service's logo on a fixed square tile, so every row lines up. Brand marks
 * come from Simple Icons in the brand's own colour; services without one get
 * their initials, and custom entries the icon their owner chose. Decorative:
 * the name is always written next to it.
 */
export function SubLogo({ name, logo, icon, size = 40 }: { name: string; logo?: BrandKey; icon?: CustomIcon; size?: number }) {
  const glyph = Math.round(size * 0.55)
  const box = { width: size, height: size }
  if (logo) {
    const m = BRAND_MARKS[logo]
    return (
      <span aria-hidden="true" style={box} className="flex shrink-0 items-center justify-center rounded-[28%] bg-paper shadow-[inset_0_0_0_1px_var(--color-line)]">
        <svg viewBox="0 0 24 24" width={glyph} height={glyph} focusable="false">
          <path d={m.path} fill={m.hex} />
        </svg>
      </span>
    )
  }
  if (icon) {
    const I = ICONS[icon].icon
    return (
      <span aria-hidden="true" style={box} className="flex shrink-0 items-center justify-center rounded-[28%] bg-accent-soft text-accent">
        <I size={glyph} strokeWidth={1.9} />
      </span>
    )
  }
  return (
    <span aria-hidden="true" style={{ ...box, fontSize: size * 0.38 }} className="serif flex shrink-0 items-center justify-center rounded-[28%] bg-surface-2 leading-none font-semibold text-ink-2">
      {initials(name)}
    </span>
  )
}
