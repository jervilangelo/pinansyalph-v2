/**
 * Minimal client for PSA OpenSTAT, which runs PxWeb.
 * API docs: https://www.scb.se/en/services/open-data-api/api-for-the-statistical-database/
 * Base: https://openstat.psa.gov.ph/PXWeb/api/v1/en/DB/...
 */
import { fetchWithRetry } from './io.ts'

export interface PxVariable {
  code: string
  text: string
  values: string[]
  valueTexts: string[]
}
export interface PxMeta {
  title: string
  variables: PxVariable[]
}
export interface PxData {
  columns: { code: string; text: string; type: string }[]
  data: { key: string[]; values: string[] }[]
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function stripBom(s: string): string {
  return s.replace(/^﻿/, '')
}

export async function getMeta(tableUrl: string): Promise<PxMeta> {
  const res = await fetchWithRetry(tableUrl)
  return JSON.parse(stripBom(await res.text())) as PxMeta
}

export async function query(
  tableUrl: string,
  selections: { code: string; values: string[] }[],
): Promise<PxData> {
  const body = {
    query: selections.map((s) => ({ code: s.code, selection: { filter: 'item', values: s.values } })),
    response: { format: 'json' },
  }
  const res = await fetchWithRetry(tableUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return JSON.parse(stripBom(await res.text())) as PxData
}

/** Find a variable value code by matching its display text. Throws if absent, so table changes fail loudly. */
export function findValue(meta: PxMeta, variableCode: string, match: (text: string) => boolean): string {
  const v = meta.variables.find((x) => x.code === variableCode)
  if (!v) throw new Error(`Variable "${variableCode}" not in table "${meta.title}"`)
  const i = v.valueTexts.findIndex((t) => match(t.trim()))
  if (i < 0) throw new Error(`No value in "${variableCode}" matched in table "${meta.title}"`)
  return v.values[i]
}

export function variable(meta: PxMeta, code: string): PxVariable {
  const v = meta.variables.find((x) => x.code === code)
  if (!v) throw new Error(`Variable "${code}" not in table "${meta.title}"`)
  return v
}

export interface PeriodValue {
  /** The selection code of the series (e.g. commodity code) */
  seriesCode: string
  year: number
  /** 1–12, or 0 for the annual average ("Ave"). */
  month: number
  value: number
}

/**
 * Convert a PxWeb json response into typed rows. Missing values ("..", "-")
 * are dropped. `seriesVar` names the variable whose code identifies the series.
 */
export function toPeriodValues(meta: PxMeta, data: PxData, seriesVar: string): PeriodValue[] {
  const codes = data.columns.map((c) => c.code)
  const iSeries = codes.indexOf(seriesVar)
  const iYear = codes.indexOf('Year')
  const iPeriod = codes.indexOf('Period')
  if (iSeries < 0 || iYear < 0 || iPeriod < 0) throw new Error('Unexpected PxWeb column layout')
  const yearVar = variable(meta, 'Year')
  const periodVar = variable(meta, 'Period')

  const out: PeriodValue[] = []
  for (const row of data.data) {
    const raw = row.values[0]?.trim()
    if (!raw || !/^-?\d+(\.\d+)?$/.test(raw)) continue
    const year = Number(yearVar.valueTexts[yearVar.values.indexOf(row.key[iYear])])
    const periodText = periodVar.valueTexts[periodVar.values.indexOf(row.key[iPeriod])]?.trim()
    const month = periodText === 'Ave' ? 0 : MONTHS.indexOf(periodText ?? '') + 1
    if (!Number.isInteger(year) || month < 0 || (month === 0 && periodText !== 'Ave')) {
      throw new Error(`Unrecognised period "${year} ${periodText}"`)
    }
    out.push({ seriesCode: row.key[iSeries], year, month, value: Number(raw) })
  }
  return out
}

export function periodKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}
