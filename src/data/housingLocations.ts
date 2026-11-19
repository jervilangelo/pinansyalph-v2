/*
 * PinansyalPH (https://pinansyalph.site/)
 * Copyright (c) 2026 Jervil Angelo De Leon. All rights reserved.
 *
 * This source code is proprietary to its author. Copying,
 * reproducing, modifying, distributing, publishing or reusing it, in whole or
 * in part, without the author's prior written permission is not allowed.
 * See the LICENSE file at the root of this repository.
 */

import type { HousingArea } from '../types/housing'

/**
 * Places people search for, mapped to the BSP Residential Property Price Index
 * area that covers them (BSP RPPI report, Table 1). The prices shown for a
 * place are always the figures for its whole BSP area: BSP does not publish
 * city, municipality or barangay prices.
 */
export interface HousingLocation {
  id: string
  name: string
  /** Province or region, for display. */
  within: string
  area: HousingArea
  keywords?: string[]
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const make = (area: HousingArea, within: string, names: (string | [string, string[]])[]): HousingLocation[] =>
  names.map((n) => {
    const [name, keywords] = typeof n === 'string' ? [n, undefined] : n
    return { id: slug(`${name}-${within}`), name, within, area, ...(keywords ? { keywords } : {}) }
  })

const NCR = make('ncr', 'Metro Manila', [
  'Caloocan',
  'Las Piñas',
  'Makati',
  'Malabon',
  'Mandaluyong',
  'Manila',
  'Marikina',
  'Muntinlupa',
  'Navotas',
  'Parañaque',
  'Pasay',
  'Pasig',
  ['Quezon City', ['qc']],
  'San Juan',
  ['Taguig', ['bgc', 'bonifacio global city']],
  'Valenzuela',
  'Pateros',
])

const BALANCE_GMA = [
  ...make('balance-gma', 'Bulacan', [['Bulacan (province)', ['bulacan']], ['San Jose del Monte', ['sjdm']], 'Malolos', 'Meycauayan', 'Marilao', 'Santa Maria', 'Bocaue', 'Baliwag', 'Plaridel', 'Guiguinto', 'Norzagaray', 'Pandi']),
  ...make('balance-gma', 'Cavite', [['Cavite (province)', ['cavite']], 'Bacoor', 'Imus', 'Dasmariñas', 'General Trias', 'Cavite City', 'Tagaytay', 'Trece Martires', 'Silang', 'Carmona', ['General Mariano Alvarez', ['gma']], 'Tanza', 'Kawit', 'Rosario', 'Naic']),
  ...make('balance-gma', 'Laguna', [['Laguna (province)', ['laguna']], 'Calamba', 'Santa Rosa', 'Biñan', 'San Pedro', 'Cabuyao', 'San Pablo', 'Los Baños', 'Santa Cruz']),
  ...make('balance-gma', 'Rizal', [['Rizal (province)', ['rizal']], 'Antipolo', 'Cainta', 'Taytay', ['Rodriguez', ['montalban']], 'San Mateo', 'Binangonan', 'Angono']),
  ...make('balance-gma', 'Batangas', [['Batangas (province)', ['batangas']], 'Batangas City', 'Lipa', 'Tanauan', 'Santo Tomas', 'Nasugbu']),
  ...make('balance-gma', 'Pampanga', [['Pampanga (province)', ['pampanga']], 'Angeles', ['San Fernando (Pampanga)', ['san fernando']], ['Mabalacat', ['clark']], 'Mexico', 'Porac']),
]

const METRO_CEBU = make('metro-cebu', 'Cebu', [
  'Cebu City',
  'Mandaue',
  'Lapu-Lapu',
  'Talisay (Cebu)',
  'Naga (Cebu)',
  'Carcar',
  'Danao',
  'Cordova',
  'Consolacion',
  'Liloan',
  'Compostela',
  'Minglanilla',
  'San Fernando (Cebu)',
])

const METRO_MINDANAO = [
  ...make('metro-mindanao', 'Metro Davao', ['Davao City', 'Panabo', 'Tagum', ['Samal', ['island garden city of samal', 'igacos']], 'Digos', 'Mati', 'Santa Cruz (Davao del Sur)', 'Hagonoy (Davao del Sur)', 'Padada', 'Malalag', 'Sulop', 'Carmen (Davao del Norte)', 'Maco', 'Malita', 'Santa Maria (Davao Occidental)']),
  ...make('metro-mindanao', 'Metro Cagayan de Oro', [['Cagayan de Oro', ['cdo']], 'El Salvador', 'Alubijid', 'Claveria', 'Gitagum', 'Initao', 'Jasaan', 'Laguindingan', 'Libertad', 'Opol', 'Tagoloan', 'Villanueva', 'Manolo Fortich']),
]

/** Provinces outside NCR, Balance GMA and the BSP metro areas; a few main cities are listed as keywords. */
const OTHER_PROVINCES: (string | [string, string[]])[] = [
  'Abra',
  ['Agusan del Norte', ['butuan']],
  'Agusan del Sur',
  ['Aklan', ['boracay', 'kalibo']],
  ['Albay', ['legazpi']],
  'Antique',
  'Apayao',
  'Aurora',
  'Basilan',
  ['Bataan', ['balanga']],
  'Batanes',
  ['Benguet', ['baguio']],
  'Biliran',
  ['Bohol', ['tagbilaran', 'panglao']],
  ['Bukidnon (outside Metro CDO)', ['bukidnon', 'malaybalay', 'valencia']],
  ['Cagayan', ['tuguegarao']],
  'Camarines Norte',
  ['Camarines Sur', ['naga city']],
  'Camiguin',
  ['Capiz', ['roxas city']],
  'Catanduanes',
  ['Cebu (outside Metro Cebu)', ['cebu province', 'toledo', 'bogo']],
  ['Cotabato', ['kidapawan']],
  'Davao de Oro',
  ['Davao del Norte (outside Metro Davao)', ['davao del norte']],
  ['Davao del Sur (outside Metro Davao)', ['davao del sur']],
  ['Davao Occidental (outside Metro Davao)', ['davao occidental']],
  ['Davao Oriental (outside Metro Davao)', ['davao oriental']],
  'Dinagat Islands',
  'Eastern Samar',
  'Guimaras',
  'Ifugao',
  ['Ilocos Norte', ['laoag']],
  ['Ilocos Sur', ['vigan']],
  ['Iloilo', ['iloilo city']],
  ['Isabela', ['santiago', 'cauayan']],
  'Kalinga',
  ['La Union', ['san fernando la union']],
  ['Lanao del Norte', ['iligan']],
  ['Lanao del Sur', ['marawi']],
  ['Leyte', ['tacloban', 'ormoc']],
  ['Maguindanao del Norte', ['cotabato city']],
  'Maguindanao del Sur',
  'Marinduque',
  'Masbate',
  'Misamis Occidental',
  ['Misamis Oriental (outside Metro CDO)', ['misamis oriental']],
  'Mountain Province',
  ['Negros Occidental', ['bacolod']],
  ['Negros Oriental', ['dumaguete']],
  'Northern Samar',
  ['Nueva Ecija', ['cabanatuan']],
  'Nueva Vizcaya',
  'Occidental Mindoro',
  ['Oriental Mindoro', ['calapan']],
  ['Palawan', ['puerto princesa']],
  ['Pangasinan', ['dagupan', 'urdaneta']],
  ['Quezon', ['lucena']],
  'Quirino',
  'Romblon',
  'Samar',
  'Sarangani',
  'Siquijor',
  'Sorsogon',
  ['South Cotabato', ['general santos', 'gensan', 'koronadal']],
  'Southern Leyte',
  'Sultan Kudarat',
  'Sulu',
  'Surigao del Norte',
  'Surigao del Sur',
  ['Tarlac', ['tarlac city']],
  'Tawi-Tawi',
  ['Zambales', ['olongapo', 'subic']],
  'Zamboanga del Norte',
  ['Zamboanga del Sur', ['zamboanga city', 'pagadian']],
  'Zamboanga Sibugay',
]

export const HOUSING_LOCATIONS: HousingLocation[] = [...NCR, ...BALANCE_GMA, ...METRO_CEBU, ...METRO_MINDANAO, ...make('other-areas', 'Province', OTHER_PROVINCES)]

export const locationById = (id: string) => HOUSING_LOCATIONS.find((l) => l.id === id)

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/** Name first, then province, then keywords (main cities, nicknames). Accents ignored. */
export function searchLocations(query: string, limit = 8): HousingLocation[] {
  const q = norm(query)
  if (!q) return []
  const scored: { l: HousingLocation; s: number; i: number }[] = []
  HOUSING_LOCATIONS.forEach((l, i) => {
    const name = norm(l.name)
    const kw = (l.keywords ?? []).map(norm)
    let s = 0
    if (name === q || kw.includes(q)) s = 100
    else if (name.startsWith(q)) s = 80
    else if (kw.some((k) => k.startsWith(q))) s = 60
    else if (name.split(' ').some((w) => w.startsWith(q))) s = 50
    else if (norm(l.within).startsWith(q)) s = 30
    if (s) scored.push({ l, s, i })
  })
  return scored
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .slice(0, limit)
    .map((x) => x.l)
}
