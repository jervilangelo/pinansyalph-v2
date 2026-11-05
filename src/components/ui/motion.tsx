import { animate, motion, useInView, useReducedMotion } from 'motion/react'
import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react'

const EASE = [0.22, 1, 0.36, 1] as const

/**
 * Staggered entrance for a section's parts. Content is visible without
 * script (initial render is opaque on the server-less first paint only
 * after hydration), and reduced motion drops the travel.
 */
export function Reveal({
  children,
  delay = 0,
  y = 24,
  className,
  as = 'div',
}: {
  children: ReactNode
  delay?: number
  y?: number
  className?: string
  as?: 'div' | 'section' | 'li' | 'header' | 'figure'
}) {
  const reduce = useReducedMotion()
  const Tag = motion[as]
  return (
    <Tag
      className={className}
      // Never fully hidden: if the observer never fires, the content is still there.
      initial={reduce ? { opacity: 1 } : { opacity: 0.15, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      transition={{ duration: 0.7, delay, ease: EASE }}
    >
      {children}
    </Tag>
  )
}

/** Animated number: counts from the previous value to the new one. */
export function AnimatedNumber({
  value,
  format,
  className,
  duration = 0.8,
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
      onUpdate: (v) => setShown(v),
    })
    from.current = value
    return () => controls.stop()
  }, [value, inView, reduce, duration])

  return (
    <span ref={ref} className={className}>
      {format(shown)}
    </span>
  )
}

/** Clip-path shutter for the one image that matters most. */
export function Shutter({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { clipPath: 'inset(0 0 100% 0)' }}
      animate={{ clipPath: 'inset(0 0 0% 0)' }}
      transition={{ duration: 1.1, ease: EASE, delay: 0.15 }}
    >
      <motion.div
        className="h-full w-full"
        initial={reduce ? false : { scale: 1.12 }}
        animate={{ scale: 1 }}
        transition={{ duration: 1.4, ease: EASE, delay: 0.15 }}
      >
        {children}
      </motion.div>
    </motion.div>
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
            <span className="-mb-[0.12em] inline-block overflow-hidden pb-[0.12em] align-bottom">
              <motion.span
                className="inline-block"
                initial={{ y: '105%' }}
                animate={{ y: 0 }}
                transition={{ duration: 0.9, delay: delay + i * stagger, ease: EASE }}
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

export { motion, useReducedMotion, EASE }
