/*
 * PinansyalPH (https://pinansyalph.site/)
 * Copyright (c) 2026 Jervil Angelo De Leon. All rights reserved.
 *
 * This source code is proprietary to its author. Copying,
 * reproducing, modifying, distributing, publishing or reusing it, in whole or
 * in part, without the author's prior written permission is not allowed.
 * See the LICENSE file at the root of this repository.
 */

import { AnimatePresence } from 'motion/react'
import { Check, Link2, Share2, X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { DUR, EASE, motion, useReducedMotion } from '../ui/motion'
import { t, tv } from '../../i18n'

/**
 * Share the current page: Facebook, Messenger, Instagram, or copy the link.
 *
 * Facebook has a web share link. Messenger and Instagram do not let websites
 * start a share on a computer, so on phones they use the phone's own share
 * sheet (which lists both apps), and on computers the link is copied and the
 * app opened, ready to paste.
 */

/** Brand marks from Simple Icons (CC0); trademarks of Meta, used only to label the share targets. */
const MARKS = {
  facebook: {
    hex: '#0866FF',
    d: 'M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z',
  },
  messenger: {
    hex: '#0866FF',
    d: 'M12 0C5.24 0 0 4.952 0 11.64c0 3.499 1.434 6.521 3.769 8.61a.96.96 0 0 1 .323.683l.065 2.135a.96.96 0 0 0 1.347.85l2.381-1.053a.96.96 0 0 1 .641-.046A13 13 0 0 0 12 23.28c6.76 0 12-4.952 12-11.64S18.76 0 12 0m6.806 7.44c.522-.03.971.567.63 1.094l-4.178 6.457a.707.707 0 0 1-.977.208l-3.87-2.504a.44.44 0 0 0-.49.007l-4.363 3.01c-.637.438-1.415-.317-.995-.966l4.179-6.457a.706.706 0 0 1 .977-.21l3.87 2.505c.15.097.344.094.491-.007l4.362-3.008a.7.7 0 0 1 .364-.13',
  },
  instagram: {
    hex: '#FF0069',
    d: 'M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077',
  },
}
const Mark = ({ k }: { k: keyof typeof MARKS }) => (
  <svg viewBox="0 0 24 24" width={18} height={18} focusable="false">
    <path d={MARKS[k].d} fill={MARKS[k].hex} />
  </svg>
)

const isPhone = () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
const canNativeShare = () => typeof navigator !== 'undefined' && typeof navigator.share === 'function'

function pageUrl() {
  const u = new URL(window.location.href)
  u.hash = ''
  return u.toString()
}

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fallback for browsers without the async clipboard.
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  }
}

export function ShareButton({ compact = false }: { compact?: boolean }) {
  const reduce = useReducedMotion()
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState('')
  const btn = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        btn.current?.focus()
      }
    }
    const onDown = (e: PointerEvent) => {
      if (!panel.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onDown)
    requestAnimationFrame(() => panel.current?.querySelector('button')?.focus())
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onDown)
    }
  }, [open])

  const nativeShare = async () => {
    try {
      await navigator.share({ title: document.title, url: pageUrl() })
      return true
    } catch {
      return false
    }
  }

  const facebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl())}`, '_blank', 'noopener,noreferrer,width=640,height=560')
    setStatus('Facebook opened in a new window.')
  }
  const messenger = async () => {
    if (isPhone() && canNativeShare() && (await nativeShare())) return
    const ok = await copy(pageUrl())
    window.open('https://www.messenger.com/', '_blank', 'noopener,noreferrer')
    setStatus(ok ? 'Link copied. Paste it into your Messenger chat.' : 'Copy the link below, then paste it into Messenger.')
  }
  const instagram = async () => {
    if (isPhone() && canNativeShare() && (await nativeShare())) return
    const ok = await copy(pageUrl())
    window.open('https://www.instagram.com/direct/inbox/', '_blank', 'noopener,noreferrer')
    setStatus(ok ? 'Link copied. Paste it into an Instagram message or story.' : 'Copy the link below, then paste it into Instagram.')
  }
  const copyLink = async () => setStatus((await copy(pageUrl())) ? 'Link copied.' : 'Could not copy. Select the link below and copy it.')

  const items: { label: string; icon: ReactNode; onClick: () => void; testId: string }[] = [
    { label: 'Facebook', icon: <Mark k="facebook" />, onClick: facebook, testId: 'share-facebook' },
    { label: 'Messenger', icon: <Mark k="messenger" />, onClick: messenger, testId: 'share-messenger' },
    { label: 'Instagram', icon: <Mark k="instagram" />, onClick: instagram, testId: 'share-instagram' },
    { label: status === 'Link copied.' ? 'Copied' : 'Copy link', icon: status === 'Link copied.' ? <Check size={18} /> : <Link2 size={18} />, onClick: copyLink, testId: 'share-copy' },
  ]

  return (
    <div className="relative">
      <button
        ref={btn}
        type="button"
        aria-expanded={open}
        aria-controls="share-panel"
        aria-label={compact ? t("Share this page") : undefined}
        onClick={() => {
          setStatus('')
          setOpen((o) => !o)
        }}
        className={`ui group flex min-h-11 cursor-pointer items-center gap-2 rounded-full border-0 bg-accent font-semibold text-accent-ink transition-colors hover:bg-accent-hover focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent ${compact ? 'mr-1 w-11 justify-center lg:hidden' : 'hidden px-4 text-[0.9375rem] lg:flex'}`}
        data-testid={compact ? 'share-button-compact' : 'share-button'}
      >
        <Share2 aria-hidden="true" size={18} strokeWidth={2.2} className="transition-transform duration-300 group-hover:-rotate-12" />
        {!compact && t("Share")}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            ref={panel}
            id="share-panel"
            role="dialog"
            aria-label={t("Share this page")}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: DUR.fast, ease: EASE } }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            className="z-50 origin-top-right max-lg:fixed max-lg:inset-x-4 max-lg:top-[calc(var(--header-h)+8px)] max-lg:ml-auto max-lg:max-w-[340px] lg:absolute lg:top-[calc(100%+8px)] lg:right-0 lg:w-[300px] rounded-[22px] bg-paper p-2 text-ink shadow-[0_24px_60px_-20px_rgba(21,21,20,0.35),0_2px_6px_rgba(21,21,20,0.06)]"
            data-testid="share-panel"
          >
            <div className="flex items-center justify-between px-3 pt-1.5 pb-1">
              <p className="ui text-[0.875rem] font-semibold text-muted">{t("Share this page")}</p>
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  btn.current?.focus()
                }}
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-muted hover:bg-surface"
              >
                <X aria-hidden="true" size={16} />
                <span className="sr-only">{t("Close")}</span>
              </button>
            </div>
            <ul className="m-0 grid list-none gap-0.5 p-0">
              {items.map((it) => (
                <li key={it.testId}>
                  <button
                    type="button"
                    onClick={it.onClick}
                    className="ui flex w-full cursor-pointer items-center gap-3 rounded-[14px] border-0 bg-transparent px-3 py-2.5 text-left text-[0.9375rem] font-semibold text-ink hover:bg-ground"
                    data-testid={it.testId}
                  >
                    <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-ground text-accent">
                      {it.icon}
                    </span>
                    {tv(it.label)}
                  </button>
                </li>
              ))}
            </ul>
            <p className="ui min-h-[1.25rem] px-3 pt-1 pb-1.5 text-[0.8125rem] leading-snug text-muted" role="status" aria-live="polite" data-testid="share-status">
              {status}
            </p>
            {status && !status.startsWith('Link copied') && !status.startsWith('Facebook') && (
              <input
                readOnly
                value={typeof window !== 'undefined' ? pageUrl() : ''}
                onFocus={(e) => e.currentTarget.select()}
                className="field-input mx-2 mb-2 !min-h-10 w-[calc(100%-16px)] !py-2 text-[0.8125rem]"
                aria-label={t("Page link")}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
