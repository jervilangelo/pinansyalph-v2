import { AnimatePresence } from 'motion/react'
import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { DUR, EASE, motion, useReducedMotion } from './motion'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Accessible dialog: rendered in a portal, labelled by its title, focus is
 * moved in and trapped, Escape and the backdrop close it, the page behind
 * stops scrolling, and focus returns to whatever opened it.
 * On phones it rises as a bottom sheet; on wider screens it sits centred.
 */
export function Modal({ open, onClose, title, description, children }: { open: boolean; onClose: () => void; title: ReactNode; description?: ReactNode; children: ReactNode }) {
  const reduce = useReducedMotion()
  const panel = useRef<HTMLDivElement>(null)
  const restore = useRef<HTMLElement | null>(null)
  const titleId = useId()
  const descId = useId()
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return
    restore.current = document.activeElement as HTMLElement | null
    const { overflow, paddingRight } = document.body.style
    const scrollbar = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`

    // Focus the first control after the panel mounts.
    const t = window.setTimeout(() => {
      const first = panel.current?.querySelector<HTMLElement>('[data-autofocus]') ?? panel.current?.querySelector<HTMLElement>(FOCUSABLE)
      first?.focus()
    }, 30)

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        closeRef.current()
        return
      }
      if (e.key !== 'Tab' || !panel.current) return
      const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null)
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(t)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      document.body.style.paddingRight = paddingRight
      restore.current?.focus?.()
    }
  }, [open])

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-[#151514]/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: DUR.base } }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descId : undefined}
            className="relative max-h-[92svh] w-full overflow-y-auto overscroll-contain rounded-t-[28px] bg-paper px-6 pt-7 pb-[max(28px,env(safe-area-inset-bottom))] shadow-[0_24px_64px_-16px_rgba(21,21,20,0.35)] sm:max-w-[520px] sm:rounded-[28px] sm:p-9"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 48, scale: 0.98 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1, transition: { duration: 0.42, ease: EASE } }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 32, scale: 0.98, transition: { duration: 0.22, ease: 'easeIn' } }}
          >
            <span aria-hidden="true" className="mx-auto -mt-3 mb-5 block h-1.5 w-10 rounded-full bg-surface-2 sm:hidden" />
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-0 bg-surface text-ink transition-colors hover:bg-surface-2 sm:top-5 sm:right-5"
            >
              <X aria-hidden="true" size={20} />
              <span className="sr-only">Close</span>
            </button>
            <h2 id={titleId} className="pr-12 text-[clamp(1.625rem,1.3rem+1.2vw,2.125rem)]">
              {title}
            </h2>
            {description && (
              <div id={descId} className="mt-3 text-[1.0625rem] leading-relaxed text-ink-2">
                {description}
              </div>
            )}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
