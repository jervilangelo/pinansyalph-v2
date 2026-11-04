import type { MonthlyObservation } from '../../src/types/data.ts'

function monthIndex(period: string): number {
  const [y, m] = period.split('-').map(Number)
  return y * 12 + (m - 1)
}

/**
 * Sanity rules for a monthly statistical series:
 * - at least 12 observations
 * - strictly consecutive months, no gaps or duplicates
 * - no month in the future
 * - latest month no older than `maxAgeMonths` (stale source detection)
 */
export function validateMonthlySeries(
  name: string,
  series: MonthlyObservation[],
  { now = new Date(), maxAgeMonths = 6 }: { now?: Date; maxAgeMonths?: number } = {},
): void {
  if (series.length < 12) throw new Error(`${name}: only ${series.length} observations`)
  for (let i = 1; i < series.length; i++) {
    if (monthIndex(series[i].period) !== monthIndex(series[i - 1].period) + 1) {
      throw new Error(`${name}: gap or duplicate between ${series[i - 1].period} and ${series[i].period}`)
    }
  }
  const nowIdx = now.getUTCFullYear() * 12 + now.getUTCMonth()
  const last = monthIndex(series[series.length - 1].period)
  if (last > nowIdx) throw new Error(`${name}: latest period ${series[series.length - 1].period} is in the future`)
  if (nowIdx - last > maxAgeMonths) {
    throw new Error(`${name}: latest period ${series[series.length - 1].period} is older than ${maxAgeMonths} months`)
  }
}
