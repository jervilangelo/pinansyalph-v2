import { ArrowUpRight, Star } from 'lucide-react'
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { AUTHOR, PORTFOLIO, REPO } from '../../site'
import { AnimatedSymbol } from '../brand/Logo'
import { Modal } from '../ui/Modal'

type Ctx = { openSupport: () => void }
const SupportContext = createContext<Ctx>({ openSupport: () => {} })
export const useSupport = () => useContext(SupportContext)

/**
 * "Support PinansyalPH". The site cannot star a repository for anyone: the
 * button opens GitHub in a new tab, where the visitor signs in and stars it
 * themselves. The dialog says so plainly.
 */
export function SupportProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const openSupport = useCallback(() => setOpen(true), [])
  const close = useCallback(() => setOpen(false), [])
  const value = useMemo(() => ({ openSupport }), [openSupport])

  return (
    <SupportContext.Provider value={value}>
      {children}
      <Modal
        open={open}
        onClose={close}
        title="Support PinansyalPH"
        description={
          <>
            <p>
              PinansyalPH is free and open source, made by one developer for Filipinos who want to understand their money. No ads,
              no sign-up, no tracking.
            </p>
            <p className="mt-3">
              The simplest way to help is a star on GitHub. It costs nothing, and it helps more people find the project.
            </p>
          </>
        }
      >
        <div aria-hidden="true" className="pointer-events-none absolute top-7 right-20 hidden opacity-90 sm:block">
          <AnimatedSymbol size={44} />
        </div>
        <div className="mt-7 grid gap-3">
          <a href={REPO} target="_blank" rel="noopener noreferrer" className="btn btn-primary group w-full" data-autofocus>
            <Star aria-hidden="true" size={18} className="transition-transform duration-500 ease-[var(--ease-out-quint)] group-hover:rotate-[72deg] group-hover:scale-110" />
            Star on GitHub
            <span className="sr-only">(opens GitHub in a new tab)</span>
          </a>
          <a href={PORTFOLIO} target="_blank" rel="noopener noreferrer" className="btn btn-soft group w-full">
            View Developer Portfolio
            <ArrowUpRight aria-hidden="true" size={18} className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </div>
        <p className="ui mt-5 text-[0.875rem] leading-relaxed text-muted">
          GitHub opens in a new tab. Sign in, then press <strong className="font-semibold text-ink-2">Star</strong> near the top of the page.
          You can also{' '}
          <a className="link" href={`${REPO}/issues/new`} target="_blank" rel="noopener noreferrer">
            report a mistake or suggest a tool
          </a>
          . Built by {AUTHOR}.
        </p>
      </Modal>
    </SupportContext.Provider>
  )
}
