import { Minus, Plus, X } from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import { CUSTOM_ICONS, MAX_PEOPLE, MAX_PRICE, entryProblem, type CustomIcon, type SubEntry } from '../../../calculators/subscriptions'
import { BILLING, CATEGORIES, SERVICES, draftFor, officialPrice, searchServices, serviceById, type Billing, type Plan, type Service, type SubCategory } from '../../../data/subscriptions'
import { dateLabel, pesoExact } from '../../../utils/format'
import { Combobox, type ComboOption } from '../../ui/Combobox'
import { AmountField, DateField, SelectField } from '../../ui/fields'
import { ICONS } from './icons'
import { SubLogo } from './SubLogo'
import { tx } from '../../../i18n/react'
import { t, tv } from '../../../i18n'

const SLIDER: Record<Billing, { max: number; step: number }> = {
  monthly: { max: 5000, step: 1 },
  quarterly: { max: 15000, step: 5 },
  annual: { max: 60000, step: 10 },
}
const PER: Record<Billing, string> = {
  monthly: '/mo',
  quarterly: '/3 mo',
  annual: '/yr',
}
const per = (b: Billing) => BILLING.find((x) => x.id === b)!.per

function planLabel(p: Plan): string {
  const priced = p.prices.map((x) => `${pesoExact(x.pesos).replace('.00', '')}${PER[x.billing]}`)
  if (priced.length) return `${p.name} · ${priced.join(' or ')}`
  if (p.usd?.length) return `${p.name} · US$${p.usd[0].dollars}${PER[p.usd[0].billing]}`
  return `${p.name} · enter your price`
}

const option = (s: Service): ComboOption => ({
  id: s.id,
  label: s.name,
  hint: CATEGORIES.find((c) => c.id === s.category)!.label,
  icon: <SubLogo name={s.name} logo={s.logo} size={32} />,
})

interface Draft {
  custom: boolean
  serviceId: string | null
  planId: string | null
  name: string
  billing: Billing
  price: number
  people: number
  category: SubCategory
  renewal: string
  icon: CustomIcon
}

function fromEntry(e: SubEntry | null): Draft {
  if (!e)
    return {
      custom: false,
      serviceId: null,
      planId: null,
      name: '',
      billing: 'monthly',
      price: 0,
      people: 1,
      category: 'other',
      renewal: '',
      icon: 'tv',
    }
  return {
    custom: !e.serviceId,
    serviceId: e.serviceId ?? null,
    planId: e.planId ?? null,
    name: e.name,
    billing: e.billing,
    price: e.price,
    people: e.people,
    category: e.category,
    renewal: e.renewal ?? '',
    icon: e.icon ?? 'tv',
  }
}

/**
 * Add or edit one subscription: search the directory (or go custom), pick the
 * plan and billing, and adjust the amount with the slider or the field. The
 * official price fills in by itself; what you actually pay always wins.
 */
export function SubscriptionForm({ editing, onSubmit, onCancel }: { editing: SubEntry | null; onSubmit: (e: Omit<SubEntry, 'id'>) => void; onCancel?: () => void }) {
  const [d, setD] = useState<Draft>(() => fromEntry(editing))
  const [error, setError] = useState<string | null>(null)
  const set = (patch: Partial<Draft>) => {
    setError(null)
    setD((x) => ({ ...x, ...patch }))
  }
  const service = d.serviceId ? serviceById(d.serviceId) : undefined
  const plan = service?.plans.find((p) => p.id === d.planId)
  const official = officialPrice(plan, d.billing)
  const id = useId()

  function pickService(s: Service | undefined) {
    if (!s) return set({ serviceId: null, planId: null, name: '', price: 0 })
    const p = s.plans[0]
    const x = draftFor(s, p)
    set({
      serviceId: s.id,
      planId: p.id,
      name: s.name,
      billing: x.billing,
      price: x.price,
      category: s.category,
      people: 1,
    })
  }
  function pickPlan(planId: string) {
    const p = service?.plans.find((x) => x.id === planId)
    if (!p || !service) return
    const x = draftFor(service, p)
    set({ planId, billing: x.billing, price: x.price, people: 1 })
  }
  function pickBilling(b: Billing) {
    const o = officialPrice(plan, b)
    // A billing period the service does not price: clear the amount rather than reuse another period's price.
    set({ billing: b, price: o ? o.pesos : d.custom || !plan ? d.price : 0 })
  }

  const slider = useMemo(() => {
    const { max, step } = SLIDER[d.billing]
    return {
      step,
      max: Math.min(MAX_PRICE, Math.max(max, Math.ceil((d.price * 1.25) / step) * step)),
    }
  }, [d.billing, d.price])

  const share = d.people > 1 && d.price > 0 ? Math.round((d.price / d.people) * 100) / 100 : null

  function submit() {
    const name = d.custom ? d.name.trim() : (service?.name ?? '')
    if (!d.custom && !service) return setError('Search for the app or service first, or add a custom one.')
    const entry: Omit<SubEntry, 'id'> = {
      name,
      category: d.category,
      billing: d.billing,
      price: d.price,
      people: d.people,
      ...(d.renewal ? { renewal: d.renewal } : {}),
      ...(d.custom ? { icon: d.icon } : { serviceId: service!.id, planId: plan?.id, planName: plan?.name }),
    }
    const problem = entryProblem(entry)
    if (problem) return setError(problem)
    onSubmit(entry)
    if (!editing) setD(fromEntry(null))
  }

  return (
    <form
      className="grid gap-5"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      aria-describedby={error ? `${id}-err` : undefined}
      data-testid="sub-form"
    >
      {/* 1. What it is */}
      {d.custom ? (
        <div className="grid gap-4">
          <div className="ui">
            <label htmlFor={`${id}-name`} className="field-label">{t("Subscription name")}</label>
            <input
              id={`${id}-name`}
              className="field-input"
              value={d.name}
              maxLength={80}
              autoComplete="off"
              placeholder={t("e.g. Gym membership, news app")}
              onChange={(e) => set({ name: e.target.value })}
            />
          </div>
          <fieldset className="ui m-0 min-w-0 border-0 p-0">
            <legend className="field-label p-0">{t("Icon")}</legend>
            <div className="flex flex-wrap gap-1.5">
              {CUSTOM_ICONS.map((k) => {
                const I = ICONS[k].icon
                return (
                  <label key={k} className="relative cursor-pointer" title={tv(ICONS[k].label)}>
                    <input type="radio" name={`${id}-icon`} value={k} checked={d.icon === k} onChange={() => set({ icon: k })} className="peer sr-only" />
                    <span className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-ground text-ink-2 transition-colors peer-checked:bg-accent peer-checked:text-white peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent hover:text-ink">
                      <I aria-hidden="true" size={20} strokeWidth={1.9} />
                      <span className="sr-only">{tv(ICONS[k].label)}</span>
                    </span>
                  </label>
                )
              })}
            </div>
          </fieldset>
          {!editing && (
            <button
              type="button"
              className="ui w-fit cursor-pointer border-0 bg-transparent p-0 text-[0.9375rem] font-semibold text-accent underline-offset-4 hover:underline"
              onClick={() => set({ ...fromEntry(null) })}
            >{t("Back to the list of apps")}</button>
          )}
        </div>
      ) : service && !editing ? (
        <div className="flex items-center gap-3 rounded-[18px] bg-ground p-3">
          <SubLogo name={service.name} logo={service.logo} size={44} />
          <span className="min-w-0 flex-1">
            <span className="block text-[1.0625rem] font-semibold">{tv(service.name)}</span>
            <span className="ui block text-[0.8125rem] text-muted">{tv(CATEGORIES.find((c) => c.id === service.category)!.label)}</span>
          </span>
          <button
            type="button"
            onClick={() => pickService(undefined)}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-muted hover:bg-surface hover:text-ink"
          >
            <X aria-hidden="true" size={18} />
            <span className="sr-only">{t("Choose a different app")}</span>
          </button>
        </div>
      ) : service && editing ? (
        <div className="flex items-center gap-3">
          <SubLogo name={service.name} logo={service.logo} size={44} />
          <span className="text-[1.0625rem] font-semibold">{tv(service.name)}</span>
        </div>
      ) : (
        <Combobox
          label={t("App or service")}
          value={null}
          onChange={(o) => pickService(o ? serviceById(o.id) : undefined)}
          search={(q) => searchServices(q).map(option)}
          placeholder={t("Try Netflix, Spotify, iCloud, ChatGPT")}
          hint={t("{length} services, with official Philippine prices where published.", { length: SERVICES.length })}
          emptyText={(q) => <>{tx("Nothing called “{q}” yet. Add it as a custom subscription below.", { q: (q), })}</>}
          footer={(close) => (
            <button
              type="button"
              className="ui flex w-full cursor-pointer items-center gap-2 rounded-[10px] border-0 bg-transparent px-3 py-2.5 text-left text-[0.9375rem] font-semibold text-accent hover:bg-paper"
              onClick={() => {
                close()
                set({ custom: true, serviceId: null, planId: null })
              }}
            >
              <Plus aria-hidden="true" size={16} />{' '}{t("Not listed? Add a custom subscription")}</button>
          )}
        />
      )}
      {!d.custom && !service && (
        <button
          type="button"
          className="ui -mt-2 w-fit cursor-pointer border-0 bg-transparent p-0 text-[0.9375rem] font-semibold text-accent underline-offset-4 hover:underline"
          onClick={() => set({ custom: true })}
        >{t("Or add a custom subscription")}</button>
      )}

      {(d.custom || service) && (
        <>
          {/* 2. Plan and billing */}
          <div className="grid gap-4 sm:grid-cols-2">
            {service && plan && (
              <SelectField
                label={t("Plan")}
                value={plan.id}
                onChange={pickPlan}
                options={service.plans.map((p) => ({
                  value: p.id,
                  label: planLabel(p),
                }))}
              />
            )}
            <SelectField<Billing> label={t("Billed")} value={d.billing} onChange={pickBilling} options={BILLING.map((b) => ({ value: b.id, label: b.label }))} />
            {d.custom && (
              <SelectField<SubCategory>
                label={t("Category")}
                value={d.category}
                onChange={(c) => set({ category: c })}
                options={CATEGORIES.map((c) => ({
                  value: c.id,
                  label: c.label,
                }))}
              />
            )}
          </div>

          {/* 3. What you pay */}
          <div className="grid gap-3">
            <div className="ui">
              <label htmlFor={`${id}-range`} className="field-label flex items-baseline justify-between gap-3">
                <span>{tx("You pay {billing}", { billing: (per(d.billing)), })}</span>
                <span className="figure text-[1.375rem] tracking-normal" data-testid="sub-price">
                  {pesoExact(d.price)}
                </span>
              </label>
              <input
                id={`${id}-range`}
                type="range"
                min={0}
                max={slider.max}
                step={slider.step}
                value={Math.min(d.price, slider.max)}
                onChange={(e) => set({ price: Number(e.target.value) })}
                className="h-11 w-full"
                aria-valuetext={`${pesoExact(d.price)} ${per(d.billing)}`}
              />
            </div>
            <AmountField label={t("Exact amount {billing}", { billing: per(d.billing) })} value={d.price} onChange={(v) => set({ price: v })} max={MAX_PRICE} />
            <PriceNote service={service} plan={plan} billing={d.billing} official={official?.pesos} price={d.price} promo={official?.promo} />
          </div>

          {/* 4. Shared plan */}
          <div className="ui">
            <p className="field-label" id={`${id}-people`}>{t("Split with others?")}</p>
            <div className="flex flex-wrap items-center gap-3">
              <div role="group" aria-labelledby={`${id}-people`} className="flex items-center gap-1 rounded-full bg-ground p-1">
                <button
                  type="button"
                  className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent hover:bg-surface disabled:opacity-40"
                  disabled={d.people <= 1}
                  onClick={() => set({ people: d.people - 1 })}
                >
                  <Minus aria-hidden="true" size={16} />
                  <span className="sr-only">{t("One person fewer")}</span>
                </button>
                <output className="figure min-w-[3ch] text-center text-[1.25rem]" aria-live="polite" data-testid="sub-people">
                  {d.people}
                </output>
                <button
                  type="button"
                  className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent hover:bg-surface disabled:opacity-40"
                  disabled={d.people >= MAX_PEOPLE}
                  onClick={() => set({ people: d.people + 1 })}
                >
                  <Plus aria-hidden="true" size={16} />
                  <span className="sr-only">{t("One person more")}</span>
                </button>
              </div>
              <p className="text-[0.9375rem] text-ink-2">
                {d.people === 1 ? (
                  t('Just you: the full amount counts.')
                ) : share != null ? (
                  <>{tx("Your share: {strong} {billing}", { strong: (<strong className="font-semibold text-ink">{pesoExact(share)}</strong>), billing: (per(d.billing)), })}</>
                ) : (
                  `${d.people} people`
                )}
              </p>
            </div>
            {plan?.seats && d.people === 1 && <p className="field-hint">{tx("This plan covers up to {seats} accounts. If others chip in, count everyone who pays, you included.", { seats: (plan.seats), })}</p>}
          </div>

          <DateField label={t("Next renewal date")} optional value={d.renewal} onChange={(v) => set({ renewal: v })} hint={t("For the renewal list. Repeats every billing period.")} />
        </>
      )}

      {error && (
        <p id={`${id}-err`} role="alert" className="ui rounded-[14px] bg-loss-soft px-4 py-3 text-[0.9375rem] text-loss">
          {tv(error)}
        </p>
      )}

      {(d.custom || service) && (
        <div className="flex flex-wrap gap-2">
          <button type="submit" className="btn btn-primary">
            {editing ? t("Save changes") : t("Add to my list")}
          </button>
          {onCancel && (
            <button type="button" className="btn btn-soft" onClick={onCancel}>{t("Cancel")}</button>
          )}
        </div>
      )}
    </form>
  )
}

function PriceNote({
  service,
  plan,
  billing,
  official,
  price,
  promo,
}: {
  service?: Service
  plan?: Plan
  billing: Billing
  official?: number
  price: number
  promo?: { pesos: number; note: string }
}) {
  if (!service || !plan) return <p className="field-hint !mt-0">{t("Enter what you pay, as it appears on your bill or statement.")}</p>
  const src = service.source
  const link = src && (
    <>{tx("{link}, checked {checked}.", { link: (<a href={src.url} target="_blank" rel="noreferrer" className="text-accent underline underline-offset-2">{t("Source")}</a>), checked: (dateLabel(src.checked)), })}</>
  )
  let body
  if (official != null) {
    body =
      price === official ? (
        <>{tx("{strong} for {name}.{link}", { strong: (<strong className="font-semibold text-gain">{t("Official Philippine price")}</strong>), name: (tv(plan.name)), link: (link), })}</>
      ) : (
        <>{tx("Official price is {official} {billing}; you entered your own amount.{link}", { official: (pesoExact(official)), billing: (per(billing)), link: (link), })}</>
      )
  } else if (plan.usd?.length) {
    const u = plan.usd.map((x) => `US$${x.dollars}${PER[x.billing]}`).join(' or ')
    body = (
      <>{tx("{strong} listed at {u}. Enter the peso amount on your card statement; it depends on your bank’s exchange rate and fees.{link}", { strong: (<strong className="font-semibold text-warn">{t("Billed in US dollars:")}</strong>), u: (u), link: (link), })}</>
    )
  } else if (plan.prices.length) {
    body = (
      <>{tx("No official {v0} price for this plan. Enter what you pay.{link}", { v0: (BILLING.find((b) => b.id === billing)!.label.toLowerCase()), link: (link), })}</>
    )
  } else {
    body = (
      <>
        <strong className="font-semibold text-warn">{t("Price not verified.")}</strong> {tv(plan.note) ?? t("Enter what you pay.")}
      </>
    )
  }
  return (
    <div className="ui grid gap-1.5 rounded-[14px] bg-ground px-4 py-3 text-[0.875rem] leading-relaxed text-ink-2" data-testid="price-note">
      <p>{body}</p>
      {promo && (
        <p>{tx("Promo: {pesos} {billing} ({note}). The regular price is used unless you change it.", { pesos: (pesoExact(promo.pesos)), billing: (per(billing)), note: (tv(promo.note)), })}</p>
      )}
      {plan.note && (official != null || plan.usd?.length) ? <p>{tv(plan.note)}</p> : null}
      {service.note && <p>{tv(service.note)}</p>}
    </div>
  )
}
