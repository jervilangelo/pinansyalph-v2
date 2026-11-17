import { animate, motion, useInView, useReducedMotion, type Transition } from 'motion/react'
import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * Motion tokens. One easing family, three durations. Everything moves with
 * transform and opacity only, and every move has a reduced-motion fallback
 * that keeps the content and drops the travel.
 */
export const EASE = [0.22, 1, 0.36, 1] as const
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const
export const DUR = { fast: 0.18, base: 0.32, slow: 0.6 } as const
export const SPRING = { type: 'spring', stiffness: 420, damping: 38, mass: 0.9 } as const satisfies Transition

/** Height + opacity for disclosures and accordions. */
export const collapse = {
  initial: { height: 0, opacity: 0 },
  animate: { height: 'auto', opacity: 1, transition: { height: { duration: DUR.base, ease: EASE }, opacity: { duration: DUR.base, delay: 0.05 } } },
  exit: { height: 0, opacity: 0, transition: { height: { duration: 0.24, ease: EASE_IN_OUT }, opacity: { duration: 0.12 } } },
}

/**
 * Staggered entrance for a section's parts. Never fully hidden: if the
 * observer never fires, the content is still there.
 */
export function Reveal({
  children,
  delay = 0,
  y = 20,
  className,
  as = 'div',
}: {
  children: ReactNode
  delay?: number
  y?: number
  className?: string
  as?: 'div' | 'section' | 'li' | 'header' | 'figure' | 'p'
}) {
  const reduce = useReducedMotion()
  const Tag = motion[as]
  return (
    <Tag
      className={className}
      initial={reduce ? { opacity: 1 } : { opacity: 0.001, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -8% 0px' }}
      transition={{ duration: DUR.slow, delay, ease: EASE }}
    >
      {children}
    </Tag>
  )
}

/** Fade-up on mount, for the first screen of a page. */
export function useEnter() {
  const reduce = useReducedMotion()
  return (delay: number) =>
    reduce ? {} : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: DUR.slow, delay, ease: EASE } }
}

/** Animated number: counts from the previous value to the new one. */
export function AnimatedNumber({
  value,
  format,
  className,
  duration = 0.7,
}: {
  value: number
  format: (n: number) => string
  className?: string
  duration?: number
}) {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const [shown, setShown] = useState(reduce ? value : 0)
  const from = useRef(reduce ? value : 0)

  useEffect(() => {
    if (reduce) {
      setShown(value)
      from.current = value
      return
    }
    if (!inView) return
    const controls = animate(from.current, value, {
      duration,
      ease: EASE,
      onUpdate: (v) => {
        from.current = v
        setShown(v)
      },
    })
    return () => controls.stop()
  }, [value, inView, reduce, duration])

  return (
    <span ref={ref} className={className}>
      {/* Screen readers and tests read the settled value; the animation is decoration. */}
      <span aria-hidden="true">{format(shown)}</span>
      <span className="sr-only">{format(value)}</span>
    </span>
  )
}

/** Headline that rises in word by word from behind a mask. Screen readers get the plain text. */
export function SplitWords({ text, delay = 0, stagger = 0.06 }: { text: string; delay?: number; stagger?: number }) {
  const reduce = useReducedMotion()
  if (reduce) return <>{text}</>
  const words = text.split(' ')
  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((w, i) => (
          <Fragment key={i}>
            <span className="-mb-[0.14em] inline-block overflow-hidden pb-[0.14em] align-bottom">
              <motion.span
                className="inline-block"
                initial={{ y: '108%' }}
                animate={{ y: 0 }}
                transition={{ duration: 0.85, delay: delay + i * stagger, ease: EASE }}
              >
                {w}
              </motion.span>
            </span>
            {i < words.length - 1 && ' '}
          </Fragment>
        ))}
      </span>
    </>
  )
}

export { motion, useReducedMotion }
