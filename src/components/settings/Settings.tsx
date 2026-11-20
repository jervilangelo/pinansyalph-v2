/*
 * PinansyalPH (https://pinansyalph.site/)
 * Copyright (c) 2026 Jervil Angelo De Leon. All rights reserved.
 *
 * This source code is proprietary to its author. Copying,
 * reproducing, modifying, distributing, publishing or reusing it, in whole or
 * in part, without the author's prior written permission is not allowed.
 * See the LICENSE file at the root of this repository.
 */

import { ArrowUpRight, Check, Globe, Info, Languages, Mail, Moon, ShieldCheck, Star, Sun, type LucideIcon } from 'lucide-react'
import { createContext, useCallback, useContext, useId, useMemo, useState, type ReactNode } from 'react'
import { LANGS, type Lang } from '../../i18n'
import { useT } from '../../i18n/react'
import { AUTHOR, EMAIL, PORTFOLIO, REPO, SITE_URL, TAGLINE } from '../../site'
import { useTheme, type Theme } from '../../theme'
import { Modal } from '../ui/Modal'

type Ctx = { openSettings: () => void }
const SettingsContext = createContext<Ctx>({ openSettings: () => {} })
export const useSettings = () => useContext(SettingsContext)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const openSettings = useCallback(() => setOpen(true), [])
  const close = useCallback(() => setOpen(false), [])
  const value = useMemo(() => ({ openSettings }), [openSettings])
  return (
    <SettingsContext.Provider value={value}>
      {children}
      <SettingsDialog open={open} onClose={close} />
    </SettingsContext.Provider>
  )
}

/** A row of large radio options drawn as tiles; native radios keep arrow-key navigation. */
function Choice<T extends string>({ name, legend, value, options, onChange }: { name: string; legend: string; value: T; options: { id: T; label: string; icon?: LucideIcon; lang?: string }[]; onChange: (v: T) => void }) {
  return (
    <fieldset className="m-0 mt-4 border-0 p-0">
      <legend className="sr-only">{legend}</legend>
      <div className={`grid gap-2 ${options.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {options.map((o) => {
          const on = o.id === value
          const Icon = o.icon
          return (
            <label key={o.id} className="relative block cursor-pointer">
              <input type="radio" name={name} value={o.id} checked={on} onChange={() => onChange(o.id)} className="peer sr-only" data-testid={`${name}-${o.id}`} />
              <span
                lang={o.lang}
                className="ui flex min-h-[52px] items-center justify-center gap-2 rounded-[16px] bg-ground px-2 text-center text-[0.9375rem] font-semibold text-ink-2 transition-[background-color,color,box-shadow] duration-200 peer-checked:bg-accent peer-checked:text-accent-ink peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent hover:bg-surface peer-checked:hover:bg-accent"
              >
                {Icon && <Icon aria-hidden="true" size={18} strokeWidth={2.2} />}
                <span className="min-w-0 truncate">{o.label}</span>
                {on && <Check aria-hidden="true" size={16} strokeWidth={2.6} className="hidden shrink-0 min-[420px]:block" />}
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

function Section({ icon: Icon, title, lead, children }: { icon: LucideIcon; title: string; lead?: string; children: ReactNode }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="border-t border-surface-2 pt-6 first:border-t-0 first:pt-0">
      <h3 id={id} className="ui flex items-center gap-2.5 text-[1.0625rem] font-semibold tracking-normal">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-accent-soft text-accent">
          <Icon aria-hidden="true" size={17} strokeWidth={2.2} />
        </span>
        {title}
      </h3>
      {lead && <p className="ui mt-2 text-[0.9375rem] text-muted">{lead}</p>}
      {children}
    </section>
  )
}

function SettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, lang, setLang } = useT()
  const { theme, setTheme } = useTheme()
  const changeTheme = (next: Theme) => {
    const root = document.documentElement
    root.classList.add('theme-switching')
    setTheme(next)
    window.setTimeout(() => root.classList.remove('theme-switching'), 50)
  }
  const benefits = [t('Free to use'), t('No signup or login'), t('No ads'), t('Works on any phone'), t('Data from official sources, checked regularly')]

  return (
    <Modal open={open} onClose={onClose} title={t('Settings')}>
      <div className="mt-6 grid gap-6" data-testid="settings">
        <Section icon={Languages} title={t('Language')} lead={t('Choose your preferred language.')}>
          <Choice<Lang> name="language" legend={t('Language')} value={lang} onChange={(l) => void setLang(l)} options={LANGS.map((l) => ({ id: l.id, label: l.label, lang: l.html }))} />
        </Section>

        <Section icon={theme === 'dark' ? Moon : Sun} title={t('Appearance')} lead={t('Choose your preferred appearance.')}>
          <Choice<Theme>
            name="theme"
            legend={t('Appearance')}
            value={theme}
            onChange={changeTheme}
            options={[
              { id: 'light', label: t('Light Mode'), icon: Sun },
              { id: 'dark', label: t('Dark Mode'), icon: Moon },
            ]}
          />
        </Section>

        <Section icon={ShieldCheck} title={t('Privacy')}>
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-2" data-testid="privacy-text">
            {t('Your financial information stays private. No personal or financial data is stored on our servers. All calculations are performed directly in your browser. No account, signup, or login is required.')}
          </p>
        </Section>

        <Section icon={Info} title={t('About PinansyalPH')}>
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-2">
            {t('PinansyalPH is a free collection of practical financial tools built for Filipinos. It helps you understand your salary, savings, everyday expenses and financial decisions through simple calculators and reference information from official sources.')}
          </p>
          <p className="serif mt-3 text-[1.0625rem] text-ink" data-testid="settings-tagline">
            {TAGLINE}
          </p>
          <ul className="ui m-0 mt-4 flex list-none flex-wrap gap-2 p-0">
            {benefits.map((b) => (
              <li key={b} className="flex items-center gap-1.5 rounded-full bg-ground px-3 py-1.5 text-[0.8125rem] font-medium text-ink-2">
                <Check aria-hidden="true" size={14} strokeWidth={2.6} className="text-gain" />
                {b}
              </li>
            ))}
          </ul>
          <div className="ui mt-5 rounded-[18px] bg-ground p-4">
            <p className="text-[0.9375rem] text-ink">{t('Developed by {name}', { name: AUTHOR })}</p>
            <ul className="m-0 mt-3 grid list-none gap-1 p-0 text-[0.9375rem]">
              <li>
                <a className="flex min-h-11 items-center gap-2.5 rounded-[12px] px-2 font-medium text-ink-2 transition-colors hover:bg-surface hover:text-ink" href={SITE_URL}>
                  <Globe aria-hidden="true" size={17} className="shrink-0 text-muted" />
                  <span className="min-w-0">
                    <span className="block text-[0.8125rem] text-muted">{t('Official website')}</span>
                    pinansyalph.site
                  </span>
                </a>
              </li>
              <li>
                <a className="flex min-h-11 items-center gap-2.5 rounded-[12px] px-2 font-medium text-ink-2 transition-colors hover:bg-surface hover:text-ink" href={PORTFOLIO} target="_blank" rel="noopener noreferrer">
                  <ArrowUpRight aria-hidden="true" size={17} className="shrink-0 text-muted" />
                  <span className="min-w-0">
                    <span className="block text-[0.8125rem] text-muted">{t('Developer portfolio')}</span>
                    jervilangelo.online
                  </span>
                  <span className="sr-only">{t('(opens in a new tab)')}</span>
                </a>
              </li>
              <li>
                <a className="flex min-h-11 items-center gap-2.5 rounded-[12px] px-2 font-medium text-ink-2 transition-colors hover:bg-surface hover:text-ink" href={REPO} target="_blank" rel="noopener noreferrer" data-testid="settings-github">
                  <Star aria-hidden="true" size={17} className="shrink-0 text-muted" />
                  <span className="min-w-0">
                    <span className="block text-[0.8125rem] text-muted">{t('Star on GitHub')}</span>
                    <span className="break-all">github.com/jervilangelo/pinansyalph-v2</span>
                  </span>
                  <span className="sr-only">{t('(opens in a new tab)')}</span>
                </a>
              </li>
              <li>
                <a className="flex min-h-11 items-center gap-2.5 rounded-[12px] px-2 font-medium text-ink-2 transition-colors hover:bg-surface hover:text-ink" href={`mailto:${EMAIL}`}>
                  <Mail aria-hidden="true" size={17} className="shrink-0 text-muted" />
                  <span className="min-w-0">
                    <span className="block text-[0.8125rem] text-muted">{t('Contact')}</span>
                    <span className="break-all">{EMAIL}</span>
                  </span>
                </a>
              </li>
            </ul>
          </div>
        </Section>
      </div>
    </Modal>
  )
}
