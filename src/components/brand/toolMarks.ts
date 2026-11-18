import type { Route } from '../../router'

/**
 * One small mark per tool, drawn on a 48-unit grid. The system: brand blue
 * geometry for what the tool is about, and the gold half-sun from the
 * PinansyalPH logo (always flat side down) rising out of it. Sizes: 24–48 px.
 *
 * Holes are real (even-odd), so the marks sit on any background.
 */
export interface MarkPart {
  d: string
  tone: 'blue' | 'gold'
  transform?: string
}

/** Half-disc, flat side down, centred on (cx, cy). */
const sun = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}a${r} ${r} 0 0 1 ${2 * r} 0Z`

export const TOOL_MARKS: Partial<Record<Route, MarkPart[]>> = {
  // Sweldo: the pay envelope, with the sun rising out of it.
  '/sweldo': [
    { tone: 'gold', d: sun(24, 19, 8) },
    {
      tone: 'blue',
      d: 'M11 19h26a3 3 0 0 1 3 3v15a3 3 0 0 1-3 3H11a3 3 0 0 1-3-3V22a3 3 0 0 1 3-3ZM11.5 22.5 24 31.2l12.5-8.7v4.3L24 35.5l-12.5-8.7Z',
    },
  ],
  // Underpaid: a seesaw tipped against you; the sun sits on the raised end.
  '/underpaid-ba-ko': [
    { tone: 'blue', d: 'M24 26.5 33 41H15Z' },
    {
      tone: 'blue',
      d: 'M6 25.25h36a1.75 1.75 0 0 1 0 3.5H6a1.75 1.75 0 0 1 0-3.5Z',
      transform: 'rotate(-15 24 27)',
    },
    { tone: 'gold', d: sun(35, 24.25, 5.5), transform: 'rotate(-15 24 27)' },
  ],
  // 13th month: a calendar page with the sun in it, the extra month.
  '/13th-month': [
    {
      tone: 'blue',
      d: 'M12 11h24a4 4 0 0 1 4 4v22a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4V15a4 4 0 0 1 4-4Zm0 9.5V37h24V20.5ZM15 6.5a1.75 1.75 0 0 1 3.5 0v6a1.75 1.75 0 0 1-3.5 0ZM29.5 6.5a1.75 1.75 0 0 1 3.5 0v6a1.75 1.75 0 0 1-3.5 0Z',
    },
    { tone: 'gold', d: sun(24, 37, 7.5) },
  ],
  // MP2: savings growing in rings around the sun.
  '/mp2': [
    {
      tone: 'blue',
      d: 'M5 39a19 19 0 0 1 38 0h-4a15 15 0 0 0-30 0ZM12 39a12 12 0 0 1 24 0h-4a8 8 0 0 0-16 0Z',
    },
    { tone: 'gold', d: sun(24, 39, 5.5) },
  ],
  // Digital banks: a phone with the sun on its screen.
  '/banks': [
    {
      tone: 'blue',
      d: 'M18 5h12a5 5 0 0 1 5 5v28a5 5 0 0 1-5 5H18a5 5 0 0 1-5-5V10a5 5 0 0 1 5-5Zm-1.5 6v24.5h15V11ZM22 38.25h4a1.25 1.25 0 0 1 0 2.5h-4a1.25 1.25 0 0 1 0-2.5Z',
    },
    { tone: 'gold', d: sun(24, 35.5, 6) },
  ],
  // MP2 vs banks: two suns on one horizon.
  '/compare': [
    { tone: 'blue', d: 'M4 33a10 10 0 0 1 20 0h-4a6 6 0 0 0-12 0Z' },
    { tone: 'gold', d: sun(34, 33, 10) },
    {
      tone: 'blue',
      d: 'M5.75 36.5h36.5a1.75 1.75 0 0 1 0 3.5H5.75a1.75 1.75 0 0 1 0-3.5Z',
    },
  ],
  // Inflation: a thermometer, its gold column rising.
  '/inflation': [
    {
      tone: 'blue',
      d: 'M24 4a6 6 0 0 1 6 6v17.6a10 10 0 1 1-12 0V10a6 6 0 0 1 6-6Zm0 3.5a2.5 2.5 0 0 0-2.5 2.5v19.4a6.5 6.5 0 1 0 5 0V10A2.5 2.5 0 0 0 24 7.5Z',
    },
    { tone: 'gold', d: 'M22.5 16a1.5 1.5 0 0 1 3 0v14.4a4.5 4.5 0 1 1-3 0Z' },
  ],
  // Fuel: a drop, with the sun inside it.
  '/gas': [
    {
      tone: 'blue',
      d: 'M24 4c5 6.2 13 15.4 13 23.5a13 13 0 0 1-26 0C11 19.4 19 10.2 24 4Zm-9 29.5h18v3H15Z',
    },
    { tone: 'gold', d: sun(24, 32.5, 6.5) },
  ],
  // Toll: the expressway running to the horizon, the sun at its end.
  '/magkano-ang-toll': [
    { tone: 'gold', d: sun(24, 18, 7.5) },
    {
      tone: 'blue',
      d: 'M20.5 18h7l11.5 23H9Zm2.4 5.5h2.2l.45 4.5h-3.1Zm-.75 8h3.7l.6 5.5h-4.9Z',
    },
  ],
  // Kuryente: a bolt striking down into the sun.
  '/magkano-kuryente': [
    { tone: 'gold', d: sun(24, 43, 12) },
    { tone: 'blue', d: 'M28.5 3 13 25.5h9.5L19 43 35.5 18.5H26Z' },
  ],
  // Bahay: a house whose arched doorway is the sun.
  '/magkano-bahay': [
    {
      tone: 'blue',
      d: 'M22 5.6a3.2 3.2 0 0 1 4 0l13.8 11.2A3.2 3.2 0 0 1 41 19.3V38a3 3 0 0 1-3 3H10a3 3 0 0 1-3-3V19.3a3.2 3.2 0 0 1 1.2-2.5Zm-5 35.4h14a7 7 0 0 0-14 0Z',
    },
    { tone: 'gold', d: sun(24, 41, 7) },
  ],
  // Konsumo: the kWh meter outside every home, the sun in its dial.
  '/magkano-konsumo': [
    {
      tone: 'blue',
      d: 'M15 4h18a6 6 0 0 1 6 6v28a6 6 0 0 1-6 6H15a6 6 0 0 1-6-6V10a6 6 0 0 1 6-6Zm9 6.5a10.5 10.5 0 1 0 0 21 10.5 10.5 0 0 0 0-21ZM17.5 35h13a1.5 1.5 0 0 1 1.5 1.5v1a1.5 1.5 0 0 1-1.5 1.5h-13a1.5 1.5 0 0 1-1.5-1.5v-1a1.5 1.5 0 0 1 1.5-1.5Z',
    },
    { tone: 'gold', d: sun(24, 24.5, 7) },
  ],
  // Internet: a router, with the sun rising from it.
  '/sulit-internet': [
    { tone: 'gold', d: sun(24, 27, 8.5) },
    {
      tone: 'blue',
      d: 'M11 27h26a4 4 0 0 1 4 4v6a4 4 0 0 1-4 4H11a4 4 0 0 1-4-4v-6a4 4 0 0 1 4-4Zm3.5 5.25a1.75 1.75 0 1 0 0 3.5 1.75 1.75 0 0 0 0-3.5Zm6 0a1.75 1.75 0 1 0 0 3.5 1.75 1.75 0 0 0 0-3.5ZM10 10.75a1.75 1.75 0 0 1 3.5 0V27H10ZM34.5 10.75a1.75 1.75 0 0 1 3.5 0V27h-3.5Z',
    },
  ],
  // Subscriptions: the renewal loop, going round the sun.
  '/magkano-subscription': [
    {
      tone: 'blue',
      d: 'M24 7a17 17 0 0 1 15.4 9.8l2.6-1.5.6 10.2-8.6-5.6 2.6-1.5A12.5 12.5 0 0 0 11.5 24H7A17 17 0 0 1 24 7ZM7.1 26.5h4.5a12.5 12.5 0 0 0 24.9 0H41A17 17 0 0 1 7.1 26.5Z',
    },
    { tone: 'gold', d: sun(24, 29, 7) },
  ],
}
