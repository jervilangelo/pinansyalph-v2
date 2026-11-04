/**
 * Validate every dataset in src/data against its schema. Runs in CI before
 * build and in the scheduled data workflow before committing.
 */
import { BankDataset, FuelDataset, InflationDataset, Mp2Dataset } from '../src/types/data.ts'
import { dataPath, readJson } from './lib/io.ts'
import type { ZodType } from 'zod'

const files: [string, ZodType][] = [
  ['inflation.json', InflationDataset],
  ['fuel.json', FuelDataset],
  ['mp2.json', Mp2Dataset],
  ['banks.json', BankDataset],
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

process.exit(failed ? 1 : 0)
