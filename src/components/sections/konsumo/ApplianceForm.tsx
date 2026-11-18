import { Minus, Plus, X } from 'lucide-react'
import { useId, useState } from 'react'
import { LIMITS, entryFor, entryProblem, usage, type ApplianceEntry, type LabelUnit } from '../../../calculators/konsumo'
import { APPLIANCE_CATEGORIES, PRESET_NOTE, applianceType, searchAppliances, type ApplianceType } from '../../../data/appliances'
import { pesoExact } from '../../../utils/format'
import { Combobox, type ComboOption } from '../../ui/Combobox'
import { Segmented, SelectField, SliderField } from '../../ui/fields'

const kwh = (n: number) => `${n.toLocaleString('en-PH', { maximumFractionDigits: 2 })} kWh`
const hrs = (n: number) => (n === 1 ? '1 hr' : `${n.toLocaleString('en-PH', { maximumFractionDigits: 2 })} hrs`)
const pct = (n: number) => `${Math.round(n * 100)}%`

const option = (a: ApplianceType): ComboOption => ({
  id: a.id,
  label: a.name,
  hint: `${APPLIANCE_CATEGORIES.find((c) => c.id === a.category)!.label} · typically ${a.range[0].toLocaleString('en-PH')}–${a.range[1].toLocaleString('en-PH')} W`,
})

const KIND_HINT = {
  continuous: 'Draws about its rating whenever it is on.',
  cycling: 'Switches on and off to hold a temperature, so it runs at full power only part of the time. Lower this if yours rarely runs.',
  variable: 'Runs below its rating most of the time. Lower this for light use, raise it for heavy use.',
} as const

type Draft = Omit<ApplianceEntry, 'id'> & { optionId?: string }

const blankCustom = (): Draft => ({ typeId: 'custom', name: '', basis: 'watts', watts: 100, fullPowerShare: 1, hoursPerDay: 4, daysPerMonth: 30, units: 1, labelKwh: 0, labelUnit: 'year' })

/**
 * Add or edit one appliance: search the directory, pick a size, then set
 * watts, hours, days and units with sliders. The estimate updates as you go.
 */
export function ApplianceForm({ editing, rate, onSubmit, onCancel }: { editing: ApplianceEntry | null; rate: number; onSubmit: (e: Omit<ApplianceEntry, 'id'>) => void; onCancel?: () => void }) {
  const id = useId()
  const [d, setD] = useState<Draft | null>(() => (editing ? { ...editing } : null))
  const [error, setError] = useState<string | null>(null)
  const set = (patch: Partial<Draft>) => {
    setError(null)
    setD((x) => (x ? { ...x, ...patch } : x))
  }
  const type = d ? applianceType(d.typeId) : undefined
  const custom = d?.typeId === 'custom'
  const kind = type?.kind ?? 'variable'

  function pick(typeId: string) {
    const base = entryFor(typeId)
    if (base) setD({ ...base, optionId: applianceType(typeId)!.options[0].id })
    setError(null)
  }
  function pickOption(optionId: string) {
    if (!type) return
    const o = type.options.find((x) => x.id === optionId)!
    set({ optionId, watts: o.watts, name: type.options.length > 1 ? `${type.name} (${o.label})` : type.name })
  }

  function submit() {
    if (!d) return
    const { optionId: _o, ...entry } = d
    void _o
    const problem = entryProblem({ ...entry, id: 'draft' })
    if (problem) return setError(problem)
    onSubmit(entry)
    if (!editing) setD(null)
  }

  const preview = d && !entryProblem({ ...d, id: 'draft' }) ? usage({ ...d, id: 'draft' }, rate) : null
  const wattsMax = Math.max(type ? type.range[1] * 1.5 : 3000, d?.watts ?? 0)

  return (
    <form
      className="grid gap-5"
      data-testid="appliance-form"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      {!d ? (
        <>
          <Combobox
            label="Appliance"
            value={null}
            onChange={(o) => o && pick(o.id)}
            search={(q) => searchAppliances(q).map(option)}
            placeholder="Try aircon, ref, electric fan, TV"
            hint="Pick the closest one; you can change the watts after."
            emptyText={(q) => <>No “{q}” in the list. Add it as your own appliance below.</>}
          />
          <button
            type="button"
            className="ui -mt-2 w-fit cursor-pointer border-0 bg-transparent p-0 text-[0.9375rem] font-semibold text-accent underline-offset-4 hover:underline"
            onClick={() => setD(blankCustom())}
          >
            Or add your own appliance
          </button>
        </>
      ) : (
        <>
          <div className="flex items-start justify-between gap-3">
            {custom ? (
              <div className="ui min-w-0 flex-1">
                <label htmlFor={`${id}-name`} className="field-label">
                  Appliance name
                </label>
                <input id={`${id}-name`} className="field-input" value={d.name} maxLength={80} placeholder="e.g. Aquarium pump" onChange={(e) => set({ name: e.target.value })} />
              </div>
            ) : (
              <div className="min-w-0">
                <p className="text-[1.125rem] font-semibold">{type?.name}</p>
                {type?.note && <p className="ui mt-1 text-[0.875rem] leading-relaxed text-muted">{type.note}</p>}
              </div>
            )}
            {!editing && (
              <button
                type="button"
                onClick={() => setD(null)}
                className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-muted hover:bg-surface hover:text-ink"
              >
                <X aria-hidden="true" size={18} />
                <span className="sr-only">Choose a different appliance</span>
              </button>
            )}
          </div>

          {type && type.options.length > 1 && !editing && (
            <SelectField
              label="Size or kind"
              value={d.optionId ?? type.options[0].id}
              onChange={pickOption}
              options={type.options.map((o) => ({ value: o.id, label: `${o.label} · ${o.watts.toLocaleString('en-PH')} W` }))}
            />
          )}

          {type?.energyLabel && (
            <Segmented<'watts' | 'label'>
              label="Estimate from"
              value={d.basis}
              onChange={(v) => set({ basis: v })}
              options={[
                { value: 'watts', label: 'Watts and hours' },
                { value: 'label', label: 'Energy label kWh' },
              ]}
            />
          )}

          {d.basis === 'label' ? (
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="ui">
                <label htmlFor={`${id}-label`} className="field-label">
                  kWh on the energy label
                </label>
                <input
                  id={`${id}-label`}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  className="field-input"
                  value={d.labelKwh || ''}
                  onChange={(e) => set({ labelKwh: Number(e.target.value) })}
                />
              </div>
              <SelectField<LabelUnit>
                label="The label’s figure is per"
                value={d.labelUnit}
                onChange={(u) => set({ labelUnit: u })}
                options={[
                  { value: 'year', label: 'Year' },
                  { value: 'month', label: 'Month' },
                  { value: 'day', label: 'Day' },
                ]}
              />
              <p className="field-hint !mt-0 sm:col-span-2">
                The yellow Philippine Energy Label estimates a unit’s use under standard test conditions. It already accounts for cycling, so hours are not needed.
              </p>
            </div>
          ) : (
            <>
              <SliderField
                label="Rated wattage"
                value={d.watts}
                onChange={(v) => set({ watts: v })}
                min={1}
                max={Math.ceil(wattsMax)}
                step={1}
                format={(v) => `${v.toLocaleString('en-PH')} W`}
                exact
                suffix="W"
                testId="watts-value"
                hint={type ? `Typical for common models: ${type.range[0].toLocaleString('en-PH')}–${type.range[1].toLocaleString('en-PH')} W. ${PRESET_NOTE}` : PRESET_NOTE}
              />
              {(custom || kind !== 'continuous') && (
                <SliderField
                  label="Share of time at full power"
                  value={d.fullPowerShare}
                  onChange={(v) => set({ fullPowerShare: v })}
                  min={0.05}
                  max={1}
                  step={0.05}
                  format={pct}
                  hint={custom ? 'Leave at 100% for things that draw steady power, like lights and fans.' : KIND_HINT[kind]}
                />
              )}
              <SliderField label="Hours a day" value={d.hoursPerDay} onChange={(v) => set({ hoursPerDay: v })} min={0} max={24} step={0.25} format={hrs} testId="hours-value" />
              <SliderField
                label="Days a month"
                value={d.daysPerMonth}
                onChange={(v) => set({ daysPerMonth: v })}
                min={0}
                max={31}
                step={1}
                format={(v) => `${v} ${v === 1 ? 'day' : 'days'}`}
                testId="days-value"
              />
            </>
          )}

          <div className="ui">
            <p className="field-label" id={`${id}-units`}>
              How many units
            </p>
            <div role="group" aria-labelledby={`${id}-units`} className="flex w-fit items-center gap-1 rounded-full bg-ground p-1">
              <button
                type="button"
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent hover:bg-surface disabled:opacity-40"
                disabled={d.units <= 1}
                onClick={() => set({ units: d.units - 1 })}
              >
                <Minus aria-hidden="true" size={16} />
                <span className="sr-only">One unit fewer</span>
              </button>
              <output className="figure min-w-[3ch] text-center text-[1.25rem]" data-testid="units-value">
                {d.units}
              </output>
              <button
                type="button"
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent hover:bg-surface disabled:opacity-40"
                disabled={d.units >= LIMITS.units}
                onClick={() => set({ units: d.units + 1 })}
              >
                <Plus aria-hidden="true" size={16} />
                <span className="sr-only">One unit more</span>
              </button>
            </div>
          </div>

          <div className="ui grid grid-cols-3 gap-3 rounded-[18px] bg-ground p-4" aria-live="polite" data-testid="appliance-preview">
            <div>
              <p className="text-[0.8125rem] text-muted">{d.basis === 'label' ? 'Average day' : 'On a day it runs'}</p>
              <p className="figure mt-1 text-[1.125rem]">{preview ? kwh(preview.dailyKwh) : '—'}</p>
            </div>
            <div>
              <p className="text-[0.8125rem] text-muted">A month</p>
              <p className="figure mt-1 text-[1.125rem]" data-testid="preview-month-kwh">
                {preview ? kwh(preview.monthlyKwh) : '—'}
              </p>
            </div>
            <div>
              <p className="text-[0.8125rem] text-muted">Cost a month</p>
              <p className="figure mt-1 text-[1.125rem]" data-testid="preview-month-cost">
                {preview ? pesoExact(preview.monthlyCost) : '—'}
              </p>
            </div>
          </div>

          {error && (
            <p role="alert" className="ui rounded-[14px] bg-loss-soft px-4 py-3 text-[0.9375rem] text-loss">
              {error}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <button type="submit" className="btn btn-primary">
              {editing ? 'Save changes' : 'Add to my household'}
            </button>
            {onCancel && (
              <button type="button" className="btn btn-soft" onClick={onCancel}>
                Cancel
              </button>
            )}
          </div>
        </>
      )}
    </form>
  )
}
