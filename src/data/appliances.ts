/**
 * Appliance presets for "Magkano Konsumo Ko?".
 *
 * These are typical label ratings of common models, to start from. They are
 * not measurements of any particular unit: the visitor's own label (watts, or
 * volts × amps, or the kWh on the energy label) always wins. The 16-inch stand
 * fan figure (50–60 W) is Meralco's own test unit.
 *
 * Three kinds of power use are kept apart:
 * - continuous: draws about its rating whenever it is on (fans, lights, routers);
 * - cycling: a compressor or heater switches on and off (refrigerators,
 *   non-inverter aircons, irons, dispensers), so it is at full power only part
 *   of the time;
 * - variable: runs below its rating most of the time (inverter aircons,
 *   induction cookers, computers under light load).
 * For cycling and variable appliances, `fullPowerShare` is the default share
 * of on-time spent at the rated wattage. It is an assumption to edit.
 */

export type ApplianceCategory = 'kitchen' | 'cooling' | 'electronics' | 'lighting' | 'laundry' | 'personal'
export type PowerKind = 'continuous' | 'cycling' | 'variable'

export const APPLIANCE_CATEGORIES: { id: ApplianceCategory; label: string }[] = [
  { id: 'cooling', label: 'Cooling' },
  { id: 'kitchen', label: 'Kitchen' },
  { id: 'electronics', label: 'Electronics' },
  { id: 'lighting', label: 'Lighting' },
  { id: 'laundry', label: 'Laundry and ironing' },
  { id: 'personal', label: 'Personal care' },
]

export interface ApplianceOption {
  id: string
  label: string
  /** Typical rated (label) wattage for this size or kind. */
  watts: number
}

export interface ApplianceType {
  id: string
  name: string
  category: ApplianceCategory
  keywords?: string[]
  /** Typical label ratings of common models, low to high. */
  range: [number, number]
  options: ApplianceOption[]
  kind: PowerKind
  /** Share of on-time at rated power, for cycling and variable appliances. */
  fullPowerShare: number
  hoursPerDay: number
  daysPerMonth: number
  /** The appliance usually carries a Philippine energy label with a kWh figure. */
  energyLabel?: boolean
  note?: string
}

export const PRESET_NOTE = 'Typical ratings of common models, to start from. Check the label on your own unit: watts, or volts × amps.'

const t = (x: ApplianceType) => x

export const APPLIANCE_TYPES: ApplianceType[] = [
  // Cooling
  t({
    id: 'aircon-inverter',
    name: 'Aircon, inverter',
    category: 'cooling',
    keywords: ['air conditioner', 'ac', 'split type'],
    range: [600, 2000],
    options: [
      { id: '1hp', label: '1 HP', watts: 900 },
      { id: '1.5hp', label: '1.5 HP', watts: 1300 },
      { id: '2hp', label: '2 HP', watts: 1700 },
      { id: '2.5hp', label: '2.5 HP', watts: 2000 },
    ],
    kind: 'variable',
    fullPowerShare: 0.5,
    hoursPerDay: 8,
    daysPerMonth: 30,
    energyLabel: true,
    note: 'An inverter unit slows its compressor once the room is cool, so it uses well below its rating most of the time.',
  }),
  t({
    id: 'aircon',
    name: 'Aircon, non-inverter',
    category: 'cooling',
    keywords: ['air conditioner', 'ac', 'window type'],
    range: [600, 2000],
    options: [
      { id: '0.75hp', label: '0.75 HP', watts: 700 },
      { id: '1hp', label: '1 HP', watts: 900 },
      { id: '1.5hp', label: '1.5 HP', watts: 1300 },
      { id: '2hp', label: '2 HP', watts: 1800 },
    ],
    kind: 'cycling',
    fullPowerShare: 0.85,
    hoursPerDay: 8,
    daysPerMonth: 30,
    energyLabel: true,
    note: 'The compressor switches off when the room reaches the set temperature, then on again.',
  }),
  t({
    id: 'fan',
    name: 'Electric fan',
    category: 'cooling',
    keywords: ['stand fan', 'ceiling fan', 'desk fan', 'electric fan'],
    range: [30, 90],
    options: [
      { id: 'desk', label: 'Desk fan', watts: 35 },
      { id: 'stand', label: 'Stand fan, 16-inch', watts: 55 },
      { id: 'ceiling', label: 'Ceiling fan', watts: 70 },
    ],
    kind: 'continuous',
    fullPowerShare: 1,
    hoursPerDay: 8,
    daysPerMonth: 30,
    note: 'Meralco’s own tests use a 16-inch stand fan rated 50–60 W. Low speed uses less.',
  }),
  t({
    id: 'dehumidifier',
    name: 'Dehumidifier',
    category: 'cooling',
    range: [150, 450],
    options: [{ id: 'home', label: 'Home size', watts: 250 }],
    kind: 'cycling',
    fullPowerShare: 0.6,
    hoursPerDay: 8,
    daysPerMonth: 30,
  }),
  t({
    id: 'air-purifier',
    name: 'Air purifier',
    category: 'cooling',
    range: [15, 80],
    options: [{ id: 'room', label: 'Room size', watts: 35 }],
    kind: 'continuous',
    fullPowerShare: 1,
    hoursPerDay: 12,
    daysPerMonth: 30,
  }),

  // Kitchen
  t({
    id: 'refrigerator',
    name: 'Refrigerator',
    category: 'kitchen',
    keywords: ['ref', 'fridge', 'freezer'],
    range: [60, 250],
    options: [
      { id: 'small', label: 'Small, 5–7 cu. ft.', watts: 90 },
      { id: 'two-door', label: 'Two-door, 8–10 cu. ft.', watts: 120 },
      { id: 'large', label: 'Large or side-by-side', watts: 200 },
    ],
    kind: 'cycling',
    fullPowerShare: 0.4,
    hoursPerDay: 24,
    daysPerMonth: 30,
    energyLabel: true,
    note: 'Plugged in all day, but the compressor runs only part of the time. The kWh on its energy label is the better figure.',
  }),
  t({
    id: 'rice-cooker',
    name: 'Rice cooker',
    category: 'kitchen',
    range: [300, 1000],
    options: [
      { id: '0.6l', label: '0.6 L', watts: 300 },
      { id: '1l', label: '1 L', watts: 450 },
      { id: '1.8l', label: '1.8 L', watts: 650 },
    ],
    kind: 'continuous',
    fullPowerShare: 1,
    hoursPerDay: 0.5,
    daysPerMonth: 30,
    note: 'Cooking time only. Keep-warm uses far less power; add it as a separate low-wattage entry if you leave it on.',
  }),
  t({
    id: 'microwave',
    name: 'Microwave oven',
    category: 'kitchen',
    range: [700, 1500],
    options: [
      { id: '20l', label: '20 L', watts: 1000 },
      { id: '30l', label: '30 L', watts: 1300 },
    ],
    kind: 'continuous',
    fullPowerShare: 1,
    hoursPerDay: 0.25,
    daysPerMonth: 30,
  }),
  t({
    id: 'induction',
    name: 'Induction cooker',
    category: 'kitchen',
    range: [1200, 2200],
    options: [{ id: 'single', label: 'Single burner', watts: 2000 }],
    kind: 'variable',
    fullPowerShare: 0.7,
    hoursPerDay: 1,
    daysPerMonth: 30,
    note: 'Most cooking happens below full power.',
  }),
  t({
    id: 'kettle',
    name: 'Electric kettle',
    category: 'kitchen',
    keywords: ['heater', 'water'],
    range: [1200, 2200],
    options: [{ id: '1.7l', label: '1.7 L', watts: 1800 }],
    kind: 'continuous',
    fullPowerShare: 1,
    hoursPerDay: 0.15,
    daysPerMonth: 30,
  }),
  t({
    id: 'water-dispenser',
    name: 'Water dispenser, hot and cold',
    category: 'kitchen',
    range: [400, 650],
    options: [{ id: 'hot-cold', label: 'Hot and cold', watts: 550 }],
    kind: 'cycling',
    fullPowerShare: 0.15,
    hoursPerDay: 24,
    daysPerMonth: 30,
    note: 'The heater and cooler switch on only to keep the water hot or cold.',
  }),
  t({
    id: 'air-fryer',
    name: 'Air fryer',
    category: 'kitchen',
    range: [1000, 1800],
    options: [
      { id: '3.5l', label: '3.5–4 L', watts: 1400 },
      { id: '6l', label: '6 L or larger', watts: 1700 },
    ],
    kind: 'cycling',
    fullPowerShare: 0.8,
    hoursPerDay: 0.5,
    daysPerMonth: 20,
  }),
  t({
    id: 'oven-toaster',
    name: 'Oven toaster',
    category: 'kitchen',
    range: [600, 1500],
    options: [{ id: 'small', label: 'Small', watts: 800 }],
    kind: 'cycling',
    fullPowerShare: 0.8,
    hoursPerDay: 0.25,
    daysPerMonth: 15,
  }),

  // Electronics
  t({
    id: 'tv',
    name: 'Television, LED',
    category: 'electronics',
    keywords: ['tv', 'smart tv'],
    range: [30, 200],
    options: [
      { id: '32', label: '32-inch', watts: 40 },
      { id: '43', label: '43-inch', watts: 70 },
      { id: '55', label: '55-inch', watts: 110 },
      { id: '65', label: '65-inch', watts: 150 },
    ],
    kind: 'continuous',
    fullPowerShare: 1,
    hoursPerDay: 5,
    daysPerMonth: 30,
  }),
  t({
    id: 'desktop',
    name: 'Desktop computer',
    category: 'electronics',
    keywords: ['pc', 'computer'],
    range: [60, 300],
    options: [{ id: 'office', label: 'Office use', watts: 120 }],
    kind: 'variable',
    fullPowerShare: 1,
    hoursPerDay: 6,
    daysPerMonth: 22,
    note: 'Watts while working, not the power supply’s maximum rating. A plug-in watt meter gives your real figure.',
  }),
  t({
    id: 'gaming-pc',
    name: 'Gaming PC',
    category: 'electronics',
    keywords: ['pc', 'computer'],
    range: [250, 750],
    options: [
      { id: 'mid', label: 'Mid-range, while gaming', watts: 350 },
      { id: 'high', label: 'High-end, while gaming', watts: 550 },
    ],
    kind: 'variable',
    fullPowerShare: 1,
    hoursPerDay: 4,
    daysPerMonth: 30,
    note: 'Power while gaming. Browsing or idle uses much less: add those hours as a separate, lower entry.',
  }),
  t({
    id: 'laptop',
    name: 'Laptop',
    category: 'electronics',
    range: [20, 120],
    options: [
      { id: 'thin', label: 'Thin and light', watts: 30 },
      { id: 'regular', label: 'Regular', watts: 45 },
      { id: 'gaming', label: 'Gaming', watts: 120 },
    ],
    kind: 'variable',
    fullPowerShare: 1,
    hoursPerDay: 8,
    daysPerMonth: 22,
    note: 'Watts while working, not the charger’s rating.',
  }),
  t({
    id: 'monitor',
    name: 'Monitor',
    category: 'electronics',
    range: [15, 60],
    options: [
      { id: '24', label: '24-inch', watts: 20 },
      { id: '27', label: '27-inch', watts: 30 },
      { id: '32', label: '32-inch', watts: 40 },
    ],
    kind: 'continuous',
    fullPowerShare: 1,
    hoursPerDay: 8,
    daysPerMonth: 22,
  }),
  t({
    id: 'console',
    name: 'Gaming console',
    category: 'electronics',
    keywords: ['playstation', 'xbox', 'switch'],
    range: [15, 220],
    options: [
      { id: 'home', label: 'Home console, while gaming', watts: 200 },
      { id: 'handheld', label: 'Handheld, docked', watts: 15 },
    ],
    kind: 'variable',
    fullPowerShare: 1,
    hoursPerDay: 3,
    daysPerMonth: 30,
  }),
  t({
    id: 'router',
    name: 'Router and modem',
    category: 'electronics',
    keywords: ['wifi', 'internet', 'modem'],
    range: [6, 25],
    options: [{ id: 'router', label: 'Fiber modem with Wi-Fi', watts: 12 }],
    kind: 'continuous',
    fullPowerShare: 1,
    hoursPerDay: 24,
    daysPerMonth: 30,
  }),
  t({
    id: 'printer',
    name: 'Printer',
    category: 'electronics',
    range: [15, 500],
    options: [
      { id: 'inkjet', label: 'Inkjet, printing', watts: 20 },
      { id: 'laser', label: 'Laser, printing', watts: 400 },
    ],
    kind: 'continuous',
    fullPowerShare: 1,
    hoursPerDay: 0.2,
    daysPerMonth: 10,
  }),
  t({
    id: 'speakers',
    name: 'Speakers',
    category: 'electronics',
    keywords: ['sound', 'karaoke', 'home theater'],
    range: [5, 200],
    options: [
      { id: 'bluetooth', label: 'Bluetooth speaker', watts: 10 },
      { id: 'home-theater', label: 'Home theater or karaoke', watts: 100 },
    ],
    kind: 'continuous',
    fullPowerShare: 1,
    hoursPerDay: 3,
    daysPerMonth: 30,
  }),
  t({
    id: 'phone-charger',
    name: 'Phone charger',
    category: 'electronics',
    range: [5, 45],
    options: [
      { id: 'standard', label: 'Standard', watts: 10 },
      { id: 'fast', label: 'Fast charger', watts: 25 },
    ],
    kind: 'continuous',
    fullPowerShare: 1,
    hoursPerDay: 2,
    daysPerMonth: 30,
  }),

  // Lighting
  t({
    id: 'led-bulb',
    name: 'LED bulb',
    category: 'lighting',
    keywords: ['light', 'ilaw'],
    range: [3, 18],
    options: [
      { id: '7w', label: '7 W', watts: 7 },
      { id: '9w', label: '9 W', watts: 9 },
      { id: '12w', label: '12 W', watts: 12 },
    ],
    kind: 'continuous',
    fullPowerShare: 1,
    hoursPerDay: 6,
    daysPerMonth: 30,
  }),
  t({
    id: 'led-tube',
    name: 'LED tube',
    category: 'lighting',
    keywords: ['light', 'ilaw'],
    range: [9, 24],
    options: [{ id: '18w', label: '4-foot, 18 W', watts: 18 }],
    kind: 'continuous',
    fullPowerShare: 1,
    hoursPerDay: 6,
    daysPerMonth: 30,
  }),
  t({
    id: 'fluorescent',
    name: 'Fluorescent lamp',
    category: 'lighting',
    keywords: ['light', 'ilaw', 'cfl', 'tube'],
    range: [10, 45],
    options: [
      { id: 'cfl', label: 'Compact (CFL)', watts: 18 },
      { id: 'circular', label: 'Circular', watts: 32 },
      { id: 't8', label: '4-foot tube with ballast', watts: 40 },
    ],
    kind: 'continuous',
    fullPowerShare: 1,
    hoursPerDay: 6,
    daysPerMonth: 30,
  }),

  // Laundry
  t({
    id: 'washer',
    name: 'Washing machine',
    category: 'laundry',
    keywords: ['laundry', 'washer'],
    range: [300, 600],
    options: [
      { id: 'twin', label: 'Twin tub', watts: 400 },
      { id: 'auto', label: 'Top-load automatic', watts: 450 },
    ],
    kind: 'continuous',
    fullPowerShare: 1,
    hoursPerDay: 1,
    daysPerMonth: 8,
  }),
  t({
    id: 'iron',
    name: 'Flat iron',
    category: 'laundry',
    keywords: ['plantsa'],
    range: [800, 1400],
    options: [
      { id: 'dry', label: 'Dry iron', watts: 1000 },
      { id: 'steam', label: 'Steam iron', watts: 1200 },
    ],
    kind: 'cycling',
    fullPowerShare: 0.6,
    hoursPerDay: 0.5,
    daysPerMonth: 8,
  }),

  // Personal care
  t({
    id: 'hair-dryer',
    name: 'Hair dryer',
    category: 'personal',
    range: [800, 2000],
    options: [
      { id: 'travel', label: 'Travel size', watts: 1000 },
      { id: 'full', label: 'Full size', watts: 1600 },
    ],
    kind: 'continuous',
    fullPowerShare: 1,
    hoursPerDay: 0.15,
    daysPerMonth: 30,
  }),
  t({
    id: 'water-heater',
    name: 'Shower water heater',
    category: 'personal',
    keywords: ['heater', 'shower'],
    range: [3000, 4500],
    options: [{ id: 'single', label: 'Single point', watts: 3500 }],
    kind: 'continuous',
    fullPowerShare: 1,
    hoursPerDay: 0.25,
    daysPerMonth: 30,
  }),
]

export const applianceType = (id: string) => APPLIANCE_TYPES.find((a) => a.id === id)

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/** Name first, then keywords. */
export function searchAppliances(query: string, limit = 8): ApplianceType[] {
  const q = norm(query)
  if (!q) return []
  return APPLIANCE_TYPES.map((a, i) => {
    const name = norm(a.name)
    const kw = (a.keywords ?? []).map(norm)
    const s = name.startsWith(q) ? 3 : name.split(' ').some((w) => w.startsWith(q)) ? 2 : kw.some((k) => k.startsWith(q) || k.split(' ').some((w) => w.startsWith(q))) ? 1 : 0
    return { a, s, i }
  })
    .filter((x) => x.s)
    .sort((x, y) => y.s - x.s || x.i - y.i)
    .slice(0, limit)
    .map((x) => x.a)
}
