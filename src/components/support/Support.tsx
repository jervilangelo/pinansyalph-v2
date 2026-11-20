/*
 * PinansyalPH (https://pinansyalph.site/)
 * Copyright (c) 2026 Jervil Angelo De Leon. All rights reserved.
 *
 * This source code is proprietary to its author. Copying,
 * reproducing, modifying, distributing, publishing or reusing it, in whole or
 * in part, without the author's prior written permission is not allowed.
 * See the LICENSE file at the root of this repository.
 */

import { ArrowUpRight, Check, Link2, Mail, Star } from 'lucide-react'
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { t } from '../../i18n'
import { tx } from '../../i18n/react'
import { AUTHOR, EMAIL, PORTFOLIO, REPO, SITE_URL } from '../../site'
import { Modal } from '../ui/Modal'

type Ctx = { openSupport: () => void }
const SupportContext = createContext<Ctx>({ openSupport: () => {} })
export const useSupport = () => useContext(SupportContext)

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/**
 * "Support PinansyalPH": the best help is telling someone about it. The
 * dialog copies the site link for sharing, and offers email for corrections
 * and ideas.
 */
export function SupportProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const openSupport = useCallback(() => {
    setCopied(false)
    setOpen(true)
  }, [])
  const close = useCallback(() => setOpen(false), [])
  const value = useMemo(() => ({ openSupport }), [openSupport])

  return (
    <SupportContext.Provider value={value}>
      {children}
      <Modal
        open={open}
        onClose={close}
        title={t('Support PinansyalPH')}
        description={
          <>
            <p>{t('PinansyalPH is free to use, made by one developer for Filipinos who want to understand their money. No ads, no signup, no tracking.')}</p>
            <p className="mt-3">{t('The simplest way to help is to share it with family and friends. It costs nothing, and it helps more Filipinos make sense of their money.')}</p>
          </>
        }
      >
        <div className="mt-7 grid gap-3">
          <button type="button" className="btn btn-primary w-full" data-autofocus onClick={async () => setCopied(await copyText(SITE_URL))}>
            {copied ? <Check aria-hidden="true" size={18} /> : <Link2 aria-hidden="true" size={18} />}
            {copied ? t('Link copied') : t('Copy the link to PinansyalPH')}
          </button>
          <a href={`mailto:${EMAIL}`} className="btn btn-soft w-full">
            <Mail aria-hidden="true" size={18} />
            {t('Send feedback')}
          </a>
          <a href={REPO} target="_blank" rel="noopener noreferrer" className="btn btn-soft w-full" data-testid="support-github">
            <Star aria-hidden="true" size={18} />
            {t('Star PinansyalPH on GitHub')}
            <span className="sr-only">{t('(opens in a new tab)')}</span>
          </a>
          <a href={PORTFOLIO} target="_blank" rel="noopener noreferrer" className="btn btn-soft group w-full">
            {t('View Developer Portfolio')}
            <ArrowUpRight aria-hidden="true" size={18} className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            <span className="sr-only">{t('(opens in a new tab)')}</span>
          </a>
        </div>
        <p className="ui mt-5 text-[0.875rem] leading-relaxed text-muted" aria-live="polite">
          {tx('Found a mistake or have an idea for a tool? Email {email}. Built by {author}.', {
            email: (
              <a className="link break-all" href={`mailto:${EMAIL}`}>
                {EMAIL}
              </a>
            ),
            author: AUTHOR,
          })}
        </p>
      </Modal>
    </SupportContext.Provider>
  )
}
