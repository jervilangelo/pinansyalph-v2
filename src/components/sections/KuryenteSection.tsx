import { useState } from 'react'
import { monthLabel, dateLabel } from '../../utils/format'
import { ToolHeader } from '../layout/Page'
import { Disclosure } from '../ui/Disclosure'
import { NumberField, SelectField, Toggle } from '../ui/fields'
import { Tabs, type TabDef } from '../ui/Tabs'
import { StatusTag } from '../ui/Status'
import type { Appliance } from '../../calculators/appliances'
import { CheckBill } from './kuryente/CheckBill'
import { AppliancesTab, CompareTab, SaveTab } from './kuryente/Tools'
import { LATEST, MERALCO, defaultTariff, isBehind, type ProviderChoice, type Tariff } from './kuryente/tariff'
import { tx } from '../../i18n/react'
import { t } from '../../i18n'

type TabId = 'check' | 'appliances' | 'compare' | 'save'
const TABS: TabDef<TabId>[] = [
  { id: 'check', label: 'Check my bill', short: 'Check bill' },
  { id: 'appliances', label: 'Appliance calculator', short: 'Appliances' },
  { id: 'compare', label: 'Compare bills', short: 'Compare' },
  { id: 'save', label: 'Save electricity', short: 'Save' },
]

export function KuryenteSection() {
  const [tab, setTab] = useState<TabId>('check')
  const [tariff, setTariff] = useState<Tariff>(defaultTariff)
  const set = (patch: Partial<Tariff>) => setTariff((t) => ({ ...t, ...patch }))
  // Shared between tabs: the household's kWh from the bill, and the appliance list (in memory only; nothing is saved).
  const [billKwh, setBillKwh] = useState(0)
  const [appliances, setAppliances] = useState<Appliance[]>([])

  return (
    <section id="kuryente" aria-labelledby="kuryente-title">
      <ToolHeader
        path="/magkano-kuryente"
        id="kuryente-title"
        title={t("Magkano Kuryente Ko?")}
        lede={
          <>{tx("{span} Check your Meralco bill against Meralco’s own published rates for your billing month, see what each appliance costs, and what you would save.", { span: (<span className="font-semibold text-ink">{t("Tama ba ang singil sa bill mo?")}</span>), })}</>
        }
        meta={<StatusTag status="verified" extra={t("Meralco rates for {month} billing, checked {verifiedOn}", { month: monthLabel(LATEST.month), verifiedOn: dateLabel(LATEST.verifiedOn) })} />}
      />

      <div className="wrap grid gap-4">
        {isBehind() && (
          <p role="status" className="ui rounded-[22px] bg-warn-soft p-4 text-[0.9375rem] leading-relaxed" data-testid="rates-behind">{tx("The newest Meralco rates here are for {month} billing. If your bill is for a later month, its rates are not in yet; the result uses {month2} rates and may be off.", { month: (monthLabel(LATEST.month)), month2: (monthLabel(LATEST.month)), })}</p>
        )}

        <TariffBar tariff={tariff} set={set} />

        <Tabs tabs={TABS} value={tab} onChange={setTab} label={t("Kuryente tools")}>
          {tab === 'check' && <CheckBill tariff={tariff} onKwh={setBillKwh} />}
          {tab === 'appliances' && <AppliancesTab tariff={tariff} appliances={appliances} setAppliances={setAppliances} />}
          {tab === 'compare' && <CompareTab />}
          {tab === 'save' && <SaveTab tariff={tariff} appliances={appliances} billKwh={billKwh} goToAppliances={() => setTab('appliances')} />}
        </Tabs>

        <Methodology />
      </div>
    </section>
  )
}

/** Provider, billing month and household type: shared by every tab. */
function TariffBar({ tariff, set }: { tariff: Tariff; set: (p: Partial<Tariff>) => void }) {
  const [more, setMore] = useState(false)
  return (
    <div className="card p-5 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
        <SelectField<ProviderChoice>
          label={t("Electricity provider")}
          value={tariff.provider}
          onChange={(provider) => set({ provider })}
          options={[
            { value: 'meralco', label: t("Meralco") },
            { value: 'manual', label: t("Other provider (enter my rate)") },
          ]}
          hint={tariff.provider === 'meralco' ? MERALCO.area : t("Electric cooperatives and other utilities are not in our data yet. Use the rate per kWh from your bill.")}
        />
        {tariff.provider === 'meralco' ? (
          <SelectField
            label={t("Billing month")}
            value={tariff.month}
            onChange={(month) => set({ month })}
            options={MERALCO.schedules.map((s, i) => ({ value: s.month, label: `${monthLabel(s.month)}${i === 0 ? ' (latest)' : ''}` }))}
            hint={t("The month printed on your bill. Each month has its own rates.")}
          />
        ) : (
          <NumberField label={t("Your rate per kWh")} suffix="₱/kWh" value={tariff.manualRate} onChange={(manualRate) => set({ manualRate })} min={0} max={100} step={0.0001} hint={t("Current charges ÷ kWh on a recent bill.")} />
        )}
        <button type="button" onClick={() => setMore(!more)} aria-expanded={more} aria-controls="tariff-more" className="ui min-h-11 cursor-pointer rounded-full border-0 bg-surface px-4 text-[0.875rem] font-semibold text-ink hover:bg-surface-2 lg:mb-[26px]">
          {more ? t("Hide household details") : t("Household details")}
        </button>
      </div>
      {more && (
        <div id="tariff-more" className="mt-5 grid gap-5 border-t border-line pt-5 sm:grid-cols-2">
          <Toggle
            label={t("Registered lifeline household")}
            checked={tariff.lifeline}
            onChange={(lifeline) => set({ lifeline })}
            description={t("Qualified low-income households registered with Meralco (for example 4Ps) get a discount up to 100 kWh: 100% up to 50 kWh, 35% up to 70, 20% up to 100.")}
          />
          {tariff.provider === 'meralco' && (
            <NumberField
              label={t("Local franchise tax of your city")}
              suffix="%"
              value={Math.round(tariff.lftRate * 10000) / 100}
              onChange={(v) => set({ lftRate: v / 100 })}
              min={0}
              max={5}
              step={0.01}
              hint={t("Meralco’s sample bills assume 0.50%. It differs by city or municipality; your bill shows the amount.")}
            />
          )}
        </div>
      )}
    </div>
  )
}

function Methodology() {
  const s = LATEST
  return (
    <div className="grid gap-3">
      <Disclosure title={t("Where the rates come from")} size="lg" headingLevel={2} id="kuryente-sources">
        <div className="grid max-w-[76ch] gap-4 text-[0.9375rem] leading-relaxed text-ink-2">
          <p>{t("Every month Meralco publishes its residential rates (the Summary Schedule of Rates) and worked sample bills at typical consumption levels. PinansyalPH copies the residential rates from those two documents and checks them by recomputing every one of Meralco’s worked bills, from 50 to 5,000 kWh. A month is added only if they match.")}</p>
          <ul className="ui m-0 grid list-none gap-2 p-0">
            {MERALCO.schedules.map((x) => (
              <li key={x.month} className="rounded-[18px] bg-ground px-4 py-3 text-[0.9375rem]">
                <span className="font-semibold">{tx("{month} billing", { month: (monthLabel(x.month)), })}</span>
                <span className="text-muted">{tx("· checked {verifiedOn} ·", { verifiedOn: (dateLabel(x.verifiedOn)), })}</span>
                <a href={x.sources.schedule} target="_blank" rel="noopener noreferrer" className="font-semibold text-accent underline underline-offset-2">{t("Schedule of rates")}</a>
                <span className="text-muted"> · </span>
                <a href={x.sources.bills} target="_blank" rel="noopener noreferrer" className="font-semibold text-accent underline underline-offset-2">{t("Sample bills")}</a>
              </li>
            ))}
          </ul>
          <p>{t("New rates are added by hand each month, after Meralco announces them (usually in the second week). Meralco’s website blocks automated access, so there is no automatic update. If your bill is for a month that is not listed, the page says so.")}</p>
          <p className="text-[0.875rem] text-muted">{tx("Latest: {month}. All Meralco rates page: {link}.", { month: (monthLabel(s.month)), link: (<a href={MERALCO.ratesPage} target="_blank" rel="noopener noreferrer" className="font-semibold text-accent underline underline-offset-2">{t("meralco.com.ph")}</a>), })}</p>
        </div>
      </Disclosure>
      <Disclosure title={t("How the bill is computed")} size="lg" headingLevel={2} id="kuryente-method">
        <div className="grid max-w-[76ch] gap-4 text-[0.9375rem] leading-relaxed text-ink-2">
          <p>{t("A Meralco bill is not one price per kWh. It adds up separate charges, each set or approved by the Energy Regulatory Commission:")}</p>
          <ul className="m-0 grid gap-1.5 pl-5">
            <li>{tx("{strong} change every month with the cost of power. Meralco passes them on without profit.", { strong: (<strong>{t("Generation, transmission and system loss")}</strong>), })}</li>
            <li>{tx("{strong} are Meralco’s own charges. Distribution depends on the month’s total kWh: up to 200, 201–300, 301–400, or over 400, and the whole month is charged at that tier. Supply and metering include a fixed amount per month.", { strong: (<strong>{t("Distribution, supply and metering")}</strong>), })}</li>
            <li>{tx("{strong} ordered by the ERC, {strong2} (lifeline, senior citizen), {strong22} and {strong222} are per kWh.", { strong: (<strong>{t("Refunds")}</strong>), strong2: (<strong>{t("subsidies")}</strong>), strong22: (<strong>{t("universal charges")}</strong>), strong222: (<strong>{t("FIT-All")}</strong>), })}</li>
            <li>{tx("{strong}: VAT at Meralco’s published effective rates, real property tax, local franchise tax (set by your city or municipality), and energy tax above 650 kWh.", { strong: (<strong>{t("Taxes")}</strong>), })}</li>
          </ul>
          <p>{t("Each line is rounded to the centavo, as on the bill. The calculation matches Meralco’s worked bills within 2 centavos up to 400 kWh, and within a few centavos for very large bills, because Meralco publishes its VAT rates rounded.")}</p>
          <p>{t("Residential customers only. Business and industrial rates, net metering, and electric cooperatives are not covered; for those, choose “Other provider” and enter your rate. A difference from the published rates is not proof of an error: read the possible reasons shown with the result.")}</p>
        </div>
      </Disclosure>
    </div>
  )
}
