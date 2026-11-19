/*
 * PinansyalPH (https://pinansyalph.site/)
 * Copyright (c) 2026 Jervil Angelo De Leon. All rights reserved.
 *
 * This source code is proprietary to its author. Copying,
 * reproducing, modifying, distributing, publishing or reusing it, in whole or
 * in part, without the author's prior written permission is not allowed.
 * See the LICENSE file at the root of this repository.
 */

import { ArrowRight } from 'lucide-react'
import { useMotionValue, useSpring } from 'motion/react'
import { useState, type PointerEvent } from 'react'
import { GROUPS, Link, TOOLS, type PageInfo } from '../../router'
import { ToolMark } from '../brand/ToolMark'
import { DUR, EASE, motion, useReducedMotion } from '../ui/motion'
import { tx } from '../../i18n/react'
import { t, tv } from '../../i18n'

/**
 * The PinansyalPH sun, with every tool rising from it as a ray.
 *
 * The logo is a sun whose rays are a growing chart; here the rays are the
 * tools themselves, on two arcs above the horizon, in the order of the
 * groups (Sahod, Ipon, Presyo, Gastos) from left to right. Each mark rises out
 * of the sun on load, then drifts gently; the pointer tilts the two arcs
 * apart a little. Hovering or focusing a mark reads it out at the horizon.
 * Every mark is a real link, so the whole thing works without any motion.
 */

// The stage is 2 : 1.12; positions are percentages of its width and height.
const RATIO = 2 / 1.12
const SUN = { x: 50, y: 88, r: 10.5 }
const ARCS = { outer: 0.45, inner: 0.285 }
const FROM = 172
const TO = 8

interface Placed {
  tool: PageInfo
  x: number
  y: number
  arc: 'outer' | 'inner'
  index: number
}

function place(): Placed[] {
  // Group order, left to right, whatever order the router lists them in.
  const ordered = GROUPS.flatMap((g) => TOOLS.filter((t) => t.group === g.id))
  const n = ordered.length
  return ordered.map((tool, i) => {
    const angle = ((FROM - ((FROM - TO) * i) / Math.max(n - 1, 1)) * Math.PI) / 180
    const arc = i % 2 === 0 ? 'outer' : 'inner'
    const r = ARCS[arc]
    return { tool, arc, index: i, x: SUN.x + r * Math.cos(angle) * 100, y: SUN.y - r * Math.sin(angle) * RATIO * 100 }
  })
}

const PLACED = place()

export function Constellation() {
  const reduce = useReducedMotion()
  const [active, setActive] = useState<PageInfo | null>(null)
  const px = useMotionValue(0)
  const py = useMotionValue(0)
  const sx = useSpring(px, { stiffness: 80, damping: 20 })
  const sy = useSpring(py, { stiffness: 80, damping: 20 })
  const innerX = useSpring(useMotionValue(0), { stiffness: 80, damping: 20 })
  const innerY = useSpring(useMotionValue(0), { stiffness: 80, damping: 20 })

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (reduce || e.pointerType !== 'mouse') return
    const box = e.currentTarget.getBoundingClientRect()
    const dx = (e.clientX - box.left) / box.width - 0.5
    const dy = (e.clientY - box.top) / box.height - 0.5
    px.set(dx * 14)
    py.set(dy * 8)
    innerX.set(dx * 6)
    innerY.set(dy * 4)
  }
  const onLeave = () => {
    px.set(0)
    py.set(0)
    innerX.set(0)
    innerY.set(0)
  }

  const group = active ? GROUPS.find((g) => g.id === active.group) : null

  return (
    <div className="grid gap-5">
      <div className="relative w-full select-none [container-type:inline-size]" style={{ aspectRatio: `${RATIO}` }} onPointerMove={onMove} onPointerLeave={onLeave} data-testid="constellation">
        {/* The sun on its horizon, from the logo. */}
        <span
          aria-hidden="true"
          className="absolute rounded-t-full bg-sun"
          style={{ left: `${SUN.x - SUN.r}%`, width: `${SUN.r * 2}%`, top: `${SUN.y - SUN.r * RATIO}%`, height: `${SUN.r * RATIO}%` }}
        />
        <span aria-hidden="true" className="absolute h-[2.2%] min-h-[6px] rounded-full bg-accent" style={{ left: '4%', right: '4%', top: `${SUN.y}%` }} />

        {(['outer', 'inner'] as const).map((arc) => (
          <motion.ul key={arc} className="pointer-events-none absolute inset-0 m-0 list-none p-0" style={arc === 'outer' ? { x: sx, y: sy } : { x: innerX, y: innerY }}>
            {PLACED.filter((p) => p.arc === arc).map((p) => (
              <motion.li
                key={p.tool.path}
                className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2"
                initial={reduce ? false : { left: `${SUN.x}%`, top: `${SUN.y - 6}%`, opacity: 0, scale: 0.4 }}
                animate={{ left: `${p.x}%`, top: `${p.y}%`, opacity: 1, scale: 1 }}
                transition={reduce ? { duration: 0 } : { delay: 0.35 + p.index * 0.05, duration: 0.9, ease: EASE }}
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
              >
                <Link
                  to={p.tool.path}
                  onMouseEnter={() => setActive(p.tool)}
                  onMouseLeave={() => setActive((a) => (a === p.tool ? null : a))}
                  onFocus={() => setActive(p.tool)}
                  onBlur={() => setActive((a) => (a === p.tool ? null : a))}
                  className="constellation-mark group flex h-[clamp(40px,9.6cqw,64px)] w-[clamp(40px,9.6cqw,64px)] items-center justify-center rounded-[28%] bg-paper shadow-[0_10px_24px_-14px_rgba(21,21,20,0.35)] transition-[transform,background-color] duration-300 ease-[var(--ease-out-quint)] hover:-translate-y-1 hover:bg-accent-soft focus-visible:bg-accent-soft"
                  style={{ animationDelay: `${-(p.index * 0.73) % 6}s` }}
                  data-testid="constellation-mark"
                >
                  <span className="sr-only">{`${tv(p.tool.name)}: ${tv(p.tool.hint ?? p.tool.blurb)}`}</span>
                  <span className="flex h-[62%] w-[62%] transition-transform duration-300 group-hover:scale-110">
                    <ToolMark path={p.tool.path} size={48} className="h-full w-full" />
                  </span>
                </Link>
              </motion.li>
            ))}
          </motion.ul>
        ))}
      </div>

      {/* The reading at the horizon: what the hovered or focused tool is. */}
      <div className="min-h-[96px] border-t-0" aria-live="polite" data-testid="constellation-caption">
        {active ? (
          <motion.div key={active.path} initial={reduce ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: DUR.fast, ease: EASE }}>
            <p className="ui text-[0.875rem] font-semibold text-accent">
              {tv(group?.label)} · {tv(group?.gloss)}
            </p>
            <p className="serif mt-1 text-[clamp(1.375rem,1.1rem+1vw,1.875rem)] leading-tight tracking-[-0.015em]">{tv(active.name)}</p>
            <p className="ui mt-1 max-w-[52ch] text-[0.9375rem] leading-snug text-ink-2">{tv(active.blurb)}</p>
          </motion.div>
        ) : (
          <div>
            <p className="serif text-[clamp(1.375rem,1.1rem+1vw,1.875rem)] leading-tight tracking-[-0.015em]">{tx("{length} tools, rising from one sun.", { length: (TOOLS.length), })}</p>
            <p className="ui mt-1 text-[0.9375rem] text-ink-2">{tx("From left to right: {v0}. Point at one to read it, or {link}", { v0: (GROUPS.map((g) => g.label).join(', ')), link: (<a href="#tools" className="group inline-flex items-center gap-1 font-semibold text-accent">{t("see the full list")}<ArrowRight aria-hidden="true" size={15} className="transition-transform duration-300 group-hover:translate-x-0.5" />
              </a>), })}</p>
          </div>
        )}
      </div>
    </div>
  )
}
