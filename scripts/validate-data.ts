/*
 * PinansyalPH (https://pinansyalph.site/)
 * Copyright (c) 2026 Jervil Angelo De Leon. All rights reserved.
 *
 * This source code is proprietary to its author. Copying,
 * reproducing, modifying, distributing, publishing or reusing it, in whole or
 * in part, without the author's prior written permission is not allowed.
 * See the LICENSE file at the root of this repository.
 */

/**
 * Validate every dataset in src/data against its schema. Runs in CI before
 * build and in the scheduled data workflow before committing.
 */
import { BankDataset, FuelDataset, InflationDataset, Mp2Dataset } from '../src/types/data.ts'
import { PayrollRules } from '../src/types/payroll.ts'
import { ElectricityDataset } from '../src/types/electricity.ts'
import { HousingDataset } from '../src/types/housing.ts'
import { SalaryBenchmarkDataset } from '../src/types/salary.ts'
import type { TollDataset } from '../src/types/toll.ts'
import { verifySchedule } from './update-electricity-rates.ts'
import { dataPath, readJson } from './lib/io.ts'
import type { ZodType } from 'zod'

const files: [string, ZodType][] = [
  ['inflation.json', InflationDataset],
  ['fuel.json', FuelDataset],
  ['mp2.json', Mp2Dataset],
  ['banks.json', BankDataset],
  ['payroll.json', PayrollRules],
  ['salary-benchmarks.json', SalaryBenchmarkDataset],
  ['electricity.json', ElectricityDataset],
  ['housing.json', HousingDataset],
]

let failed = false
for (const [name, schema] of files) {
  const data = readJson(dataPath(name))
  const res = schema.safeParse(data)
  if (res.success) {
    console.log(`✓ ${name}`)
  } else {
    failed = true
    console.error(`✗ ${name}\n${res.error.message}`)
  }
}

// Cross-file rules
const banks = readJson<BankDataset>(dataPath('banks.json'))
const ids = new Set<string>()
for (const p of banks?.products ?? []) {
  if (ids.has(p.id)) {
    failed = true
    console.error(`✗ banks.json: duplicate id ${p.id}`)
  }
  ids.add(p.id)
  if (p.kind === 'time-deposit' && !p.termMonths) {
    failed = true
    console.error(`✗ banks.json: ${p.id} is a time deposit without termMonths`)
  }
}
const mp2 = readJson<Mp2Dataset>(dataPath('mp2.json'))
const years = (mp2?.rates ?? []).map((r) => r.year)
if (new Set(years).size !== years.length) {
  failed = true
  console.error('✗ mp2.json: duplicate year')
}

const salary = readJson<SalaryBenchmarkDataset>(dataPath('salary-benchmarks.json'))
const salaryKeys = new Set<string>()
for (const b of salary?.benchmarks ?? []) {
  const key = [b.occupation, b.survey, b.region, b.industry, b.measure, b.basis].join('|')
  if (salaryKeys.has(key)) {
    failed = true
    console.error(`✗ salary-benchmarks.json: duplicate figure ${key}`)
  }
  salaryKeys.add(key)
  if (!salary!.surveys.some((s) => s.id === b.survey) || !salary!.tables.some((t) => t.id === b.table)) {
    failed = true
    console.error(`✗ salary-benchmarks.json: ${key} refers to an unknown survey or table`)
  }
}

// Toll matrices: square, whole pesos, bigger vehicles never cheaper, connections point at real plazas.
const tolls = readJson<TollDataset>(dataPath('tolls.json'))
const tollErr = (msg: string) => {
  failed = true
  console.error(`✗ tolls.json: ${msg}`)
}
if (!tolls?.expressways?.length) tollErr('no expressways')
for (const x of tolls?.expressways ?? []) {
  const n = x.plazas.length
  if (new Set(x.plazas.map((p) => p.id)).size !== n) tollErr(`${x.id} has duplicate plaza ids`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(x.effective)) tollErr(`${x.id} effective date is not ISO`)
  for (const cls of ['1', '2', '3'] as const) {
    const m = x.fares[cls]
    if (m?.length !== n || m.some((row) => row.length !== n)) tollErr(`${x.id} class ${cls} matrix is not ${n}×${n}`)
    m?.forEach((row, i) =>
      row.forEach((v, j) => {
        if (i === j && v != null) tollErr(`${x.id} charges a fare to the same plaza`)
        if (v != null && !(Number.isInteger(v) && v > 0)) tollErr(`${x.id} class ${cls} has an invalid fare ${v}`)
        if (cls !== '1' && v != null && x.fares[String(Number(cls) - 1) as '1'][i][j]! > v) tollErr(`${x.id} class ${cls} is cheaper than class ${Number(cls) - 1} for ${x.plazas[i].id}→${x.plazas[j].id}`)
      }),
    )
  }
}
if (tolls) {
  console.log(`✓ tolls.json (${tolls.expressways.length} expressways)`)
  for (const c of tolls.connections)
    for (const e of [c.a, c.b]) if (!tolls.expressways.find((x) => x.id === e.expressway)?.plazas.some((p) => p.id === e.plaza)) tollErr(`connection to unknown plaza ${e.expressway}/${e.plaza}`)
}

// Electricity: each month must still reproduce Meralco's own worked bills (see scripts/update-electricity-rates.ts).
const elec = readJson<ElectricityDataset>(dataPath('electricity.json'))
for (const p of elec?.providers ?? []) {
  const months = p.schedules.map((s) => s.month)
  if (new Set(months).size !== months.length) {
    failed = true
    console.error(`✗ electricity.json: ${p.id} has a duplicate month`)
  }
  for (const s of p.schedules) {
    const bad = verifySchedule(s)
    if (bad.length) {
      failed = true
      console.error(`✗ electricity.json: ${p.id} ${s.month} no longer reproduces the utility's worked bills: ${bad.join('; ')}`)
    }
  }
}

process.exit(failed ? 1 : 0)
