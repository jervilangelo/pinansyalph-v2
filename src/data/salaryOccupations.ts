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
 * Job titles people actually type, mapped to the PSA benchmark occupation
 * they belong to, if any. This mapping is editorial (kept in the repo and
 * reviewed by hand), separate from the fetched PSA figures.
 *
 * Rules:
 *  - A title points at a PSA benchmark only when it falls inside that PSA
 *    occupation group (Philippine Standard Occupational Classification, PSOC,
 *    which follows ISCO-08). Similar-sounding is not enough: an Accountant
 *    (PSOC 2411, professional) is not an Accounting clerk (PSOC 4311).
 *  - Titles PSA's open tables do not cover are listed anyway, with
 *    `benchmark: null`, so the visitor gets an honest "no occupation
 *    benchmark" answer instead of a wrong match.
 */

export type BenchmarkOccupation = 'general-office-clerks' | 'elementary-occupations' | 'accounting-bookkeeping-clerks'

export interface PsaOccupation {
  id: BenchmarkOccupation
  title: string
  psoc: string
  /** What the group covers, in plain words, so a visitor can check the fit. */
  description: string
}

export const PSA_OCCUPATIONS: Record<BenchmarkOccupation, PsaOccupation> = {
  'general-office-clerks': {
    id: 'general-office-clerks',
    title: 'General office clerks',
    psoc: 'PSOC 4110',
    description: 'Clerical work by established procedures: recording, filing, sorting and checking documents, answering routine queries, and basic office tasks.',
  },
  'accounting-bookkeeping-clerks': {
    id: 'accounting-bookkeeping-clerks',
    title: 'Accounting and bookkeeping clerks',
    psoc: 'PSOC 4311',
    description: 'Recording and computing accounting and bookkeeping entries: ledgers, payables, receivables and routine reconciliations, under an accountant’s direction.',
  },
  'elementary-occupations': {
    id: 'elementary-occupations',
    title: 'Elementary occupations',
    psoc: 'PSOC major group 9',
    description: 'Simple, routine tasks that mainly need physical effort: cleaners and helpers, laborers in construction, manufacturing and transport, messengers, food preparation helpers, refuse workers.',
  },
}

export interface JobTitle {
  id: string
  title: string
  aliases: string[]
  benchmark: BenchmarkOccupation | null
  /** For titles without a benchmark: the industry most people with this title work in, if one is typical. */
  typicalIndustry?: string
  /** For titles without a benchmark: a PSA group that fits only if the work is mainly that kind. */
  related?: BenchmarkOccupation
}

export const JOB_TITLES: JobTitle[] = [
  // General office clerks (PSOC 4110)
  { id: 'office-clerk', title: 'Office clerk', aliases: ['general office clerk', 'clerk', 'general clerk', 'clerical staff', 'office staff'], benchmark: 'general-office-clerks' },
  { id: 'admin-clerk', title: 'Administrative clerk', aliases: ['admin clerk', 'admin staff', 'administrative staff', 'office assistant'], benchmark: 'general-office-clerks' },

  // Accounting and bookkeeping clerks (PSOC 4311)
  { id: 'bookkeeper', title: 'Bookkeeper', aliases: ['bookkeeping clerk', 'book keeper'], benchmark: 'accounting-bookkeeping-clerks' },
  { id: 'accounting-clerk', title: 'Accounting clerk', aliases: ['accounts clerk', 'accounting staff', 'accounting assistant'], benchmark: 'accounting-bookkeeping-clerks' },
  { id: 'ap-clerk', title: 'Accounts payable clerk', aliases: ['ap clerk', 'payables clerk', 'ap staff'], benchmark: 'accounting-bookkeeping-clerks' },
  { id: 'ar-clerk', title: 'Accounts receivable clerk', aliases: ['ar clerk', 'receivables clerk', 'collection clerk', 'ar staff'], benchmark: 'accounting-bookkeeping-clerks' },

  // Elementary occupations (PSOC major group 9)
  { id: 'janitor', title: 'Janitor or cleaner', aliases: ['janitress', 'cleaner', 'utility', 'utility worker', 'utility staff', 'maintenance cleaner', 'housekeeping staff'], benchmark: 'elementary-occupations' },
  { id: 'messenger', title: 'Messenger', aliases: ['office messenger', 'runner', 'liaison messenger', 'document runner'], benchmark: 'elementary-occupations' },
  { id: 'helper', title: 'Helper or laborer', aliases: ['laborer', 'labourer', 'general helper', 'helper', 'factory helper', 'production helper'], benchmark: 'elementary-occupations' },
  { id: 'construction-laborer', title: 'Construction laborer', aliases: ['construction helper', 'construction worker', 'mason helper', 'peon'], benchmark: 'elementary-occupations' },
  { id: 'kitchen-helper', title: 'Kitchen helper or dishwasher', aliases: ['dishwasher', 'kitchen crew', 'food preparation helper', 'kitchen staff'], benchmark: 'elementary-occupations' },
  { id: 'warehouse-helper', title: 'Warehouse helper or porter', aliases: ['porter', 'freight handler', 'loader', 'cargo handler', 'stockroom helper', 'bodegero helper'], benchmark: 'elementary-occupations' },
  { id: 'packer', title: 'Packer', aliases: ['hand packer', 'packaging helper', 'packing staff', 'bagger'], benchmark: 'elementary-occupations' },
  { id: 'room-attendant', title: 'Hotel room attendant (housekeeping)', aliases: ['room attendant', 'chambermaid', 'housekeeping attendant'], benchmark: 'elementary-occupations' },
  { id: 'garbage-collector', title: 'Garbage collector', aliases: ['refuse collector', 'waste collector', 'street sweeper'], benchmark: 'elementary-occupations' },
  { id: 'farm-laborer', title: 'Farm or plantation laborer', aliases: ['farm worker', 'farm hand', 'plantation worker'], benchmark: 'elementary-occupations' },

  // Common titles with no occupation benchmark in PSA's open tables
  { id: 'it-support', title: 'IT Support Specialist', aliases: ['it support', 'helpdesk', 'help desk', 'technical support', 'desktop support', 'it staff'], benchmark: null, typicalIndustry: 'information-communications' },
  { id: 'software-developer', title: 'Software Developer', aliases: ['programmer', 'software engineer', 'web developer', 'developer'], benchmark: null, typicalIndustry: 'information-communications' },
  { id: 'accountant', title: 'Accountant', aliases: ['cpa', 'staff accountant', 'senior accountant', 'auditor'], benchmark: null, related: 'accounting-bookkeeping-clerks' },
  { id: 'hr-specialist', title: 'HR Specialist', aliases: ['hr', 'human resources', 'hr assistant', 'hr staff', 'recruiter', 'talent acquisition'], benchmark: null },
  { id: 'csr', title: 'Customer Service Representative', aliases: ['csr', 'call center agent', 'call centre agent', 'customer service', 'bpo agent', 'contact center agent', 'chat support'], benchmark: null, typicalIndustry: 'administrative-support-service-activities' },
  { id: 'admin-assistant', title: 'Administrative Assistant or Secretary', aliases: ['admin assistant', 'secretary', 'executive assistant', 'personal assistant'], benchmark: null, related: 'general-office-clerks' },
  { id: 'data-encoder', title: 'Data Encoder', aliases: ['encoder', 'data entry', 'data entry clerk'], benchmark: null, related: 'general-office-clerks' },
  { id: 'virtual-assistant', title: 'Virtual Assistant', aliases: ['va', 'online assistant'], benchmark: null },
  { id: 'sales-associate', title: 'Sales Associate', aliases: ['saleslady', 'salesman', 'sales clerk', 'promodiser', 'sales staff'], benchmark: null, typicalIndustry: 'wholesale-retail-trade-repair-of' },
  { id: 'cashier', title: 'Cashier', aliases: ['teller', 'store cashier'], benchmark: null, typicalIndustry: 'wholesale-retail-trade-repair-of' },
  { id: 'bank-teller', title: 'Bank Teller', aliases: ['bank staff', 'teller'], benchmark: null, typicalIndustry: 'financial-insurance-activities' },
  { id: 'security-guard', title: 'Security Guard', aliases: ['guard', 'security officer', 'sekyu'], benchmark: null, typicalIndustry: 'administrative-support-service-activities' },
  { id: 'driver', title: 'Driver', aliases: ['company driver', 'delivery driver', 'truck driver', 'rider', 'delivery rider'], benchmark: null, typicalIndustry: 'transportation-storage' },
  { id: 'nurse', title: 'Nurse', aliases: ['staff nurse', 'registered nurse', 'rn'], benchmark: null, typicalIndustry: 'human-health-social-work-activities' },
  { id: 'teacher', title: 'Teacher (private school)', aliases: ['teacher', 'instructor', 'professor', 'tutor'], benchmark: null, typicalIndustry: 'education' },
  { id: 'cook', title: 'Cook', aliases: ['line cook', 'chef', 'kusinero'], benchmark: null, typicalIndustry: 'accommodation-food-service-activities' },
  { id: 'service-crew', title: 'Waiter or service crew', aliases: ['waiter', 'waitress', 'server', 'service crew', 'barista'], benchmark: null, typicalIndustry: 'accommodation-food-service-activities' },
  { id: 'production-operator', title: 'Production operator', aliases: ['machine operator', 'factory worker', 'operator', 'production worker'], benchmark: null, typicalIndustry: 'manufacturing' },
  { id: 'engineer', title: 'Engineer', aliases: ['civil engineer', 'mechanical engineer', 'electrical engineer', 'project engineer'], benchmark: null },
  { id: 'marketing', title: 'Marketing Specialist', aliases: ['marketing', 'marketing assistant', 'social media manager', 'digital marketer'], benchmark: null },
  { id: 'graphic-designer', title: 'Graphic Designer', aliases: ['designer', 'layout artist', 'multimedia artist'], benchmark: null },
]

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/**
 * Rank job titles for a search query. Exact title or alias first, then
 * prefix matches, then words contained anywhere. Empty query returns none.
 */
export function searchJobTitles(query: string, limit = 8): JobTitle[] {
  const q = norm(query)
  if (!q) return []
  const scored: { t: JobTitle; s: number }[] = []
  for (const t of JOB_TITLES) {
    const names = [t.title, ...t.aliases].map(norm)
    let s = 0
    if (names.some((n) => n === q)) s = 100
    else if (names.some((n) => n.startsWith(q))) s = 60
    else if (names.some((n) => n.split(' ').some((w) => w.startsWith(q)))) s = 40
    else if (q.split(' ').every((w) => names.some((n) => n.includes(w)))) s = 20
    if (s) scored.push({ t, s: s + (names[0].startsWith(q) ? 5 : 0) })
  }
  return scored
    .sort((a, b) => b.s - a.s || a.t.title.localeCompare(b.t.title))
    .slice(0, limit)
    .map((x) => x.t)
}

export const jobTitleById = (id: string) => JOB_TITLES.find((t) => t.id === id)
