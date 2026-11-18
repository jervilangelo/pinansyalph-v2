import type { BrandKey } from './brandMarks'

/**
 * Subscription prices for the Philippines, from each service's own pricing
 * page, read from a Philippine connection on the date in `checked`.
 *
 * Rules (see docs/METHODOLOGY.md §13):
 * - Only prices the service itself publishes in pesos for the Philippines are
 *   given as `prices`. Nothing is converted from US dollars.
 * - A service that bills the Philippines in US dollars lists its dollar price
 *   in `usd`, so the visitor can enter the peso charge on their own statement.
 * - A plan whose price could not be verified has no prices: the visitor types
 *   what they pay.
 * - Introductory and promotional prices are kept apart from the regular
 *   renewal price, in `promo`.
 */

export type Billing = 'monthly' | 'quarterly' | 'annual'
export type SubCategory = 'entertainment' | 'productivity' | 'ai' | 'gaming' | 'lifestyle' | 'other'

export const CATEGORIES: { id: SubCategory; label: string }[] = [
  { id: 'entertainment', label: 'Streaming and music' },
  { id: 'productivity', label: 'Cloud and productivity' },
  { id: 'ai', label: 'AI tools' },
  { id: 'gaming', label: 'Gaming' },
  { id: 'lifestyle', label: 'Lifestyle and learning' },
  { id: 'other', label: 'Other' },
]

export const BILLING: {
  id: Billing
  label: string
  months: number
  per: string
}[] = [
  { id: 'monthly', label: 'Monthly', months: 1, per: 'a month' },
  {
    id: 'quarterly',
    label: 'Every 3 months',
    months: 3,
    per: 'every 3 months',
  },
  { id: 'annual', label: 'Yearly', months: 12, per: 'a year' },
]

export interface Price {
  billing: Billing
  /** The regular price in pesos, as the service lists it. */
  pesos: number
  /** A limited or first-period offer, kept apart from the regular price. */
  promo?: { pesos: number; note: string }
}

export interface Plan {
  id: string
  name: string
  /** Accounts the plan covers, when it is shared (family, duo). */
  seats?: number
  prices: Price[]
  /** Dollar price, for services that bill the Philippines in US dollars. */
  usd?: { billing: Billing; dollars: number }[]
  note?: string
}

export interface Service {
  id: string
  name: string
  category: SubCategory
  logo?: BrandKey
  /** Where the prices come from, and when they were read. */
  source?: { url: string; checked: string }
  plans: Plan[]
  /** Shown under the plan picker, e.g. "Not officially sold in the Philippines". */
  note?: string
  keywords?: string[]
}

export const CHECKED = '2026-11-18'
const src = (url: string, checked = CHECKED) => ({ url, checked })
const m = (pesos: number): Price => ({ billing: 'monthly', pesos })
const y = (pesos: number): Price => ({ billing: 'annual', pesos })
const usdM = (dollars: number) => ({ billing: 'monthly' as const, dollars })
const usdY = (dollars: number) => ({ billing: 'annual' as const, dollars })
/** A plan the service sells but whose Philippine price could not be verified. */
const unverified = (id: string, name: string, note?: string): Plan => ({
  id,
  name,
  prices: [],
  ...(note ? { note } : {}),
})

const IN_APP = 'Priced in the app store at checkout; no public Philippine price page. Enter what you pay.'

export const SERVICES: Service[] = [
  /* ---------------- Streaming and music ---------------- */
  {
    id: 'spotify',
    name: 'Spotify Premium',
    category: 'entertainment',
    logo: 'spotify',
    source: src('https://www.spotify.com/ph-en/premium/'),
    plans: [
      {
        id: 'individual',
        name: 'Individual',
        prices: [m(169)],
        note: 'New members may get an introductory offer; this is the regular price.',
      },
      { id: 'student', name: 'Student', prices: [m(85)] },
      { id: 'duo', name: 'Duo', seats: 2, prices: [m(229)] },
      { id: 'family', name: 'Family', seats: 6, prices: [m(279)] },
    ],
  },
  {
    id: 'netflix',
    name: 'Netflix',
    category: 'entertainment',
    logo: 'netflix',
    source: src('https://help.netflix.com/en/node/24926'),
    note: 'Netflix bills monthly only.',
    plans: [
      { id: 'mobile', name: 'Mobile', prices: [m(169)] },
      { id: 'basic', name: 'Basic', prices: [m(279)] },
      { id: 'standard', name: 'Standard', prices: [m(449)] },
      { id: 'premium', name: 'Premium', prices: [m(619)] },
      {
        id: 'extra-member',
        name: 'Extra member slot',
        prices: [m(169)],
        note: 'Added to a Standard or Premium plan.',
      },
    ],
  },
  {
    id: 'disney',
    name: 'Disney+',
    category: 'entertainment',
    keywords: ['disney plus'],
    source: src('https://www.disneyplus.com/en-ph'),
    plans: [
      { id: 'standard', name: 'Standard', prices: [m(289), y(2290)] },
      { id: 'premium', name: 'Premium', prices: [m(599), y(4850)] },
    ],
  },
  {
    id: 'youtube-premium',
    name: 'YouTube Premium',
    category: 'entertainment',
    logo: 'youtube',
    source: src('https://www.youtube.com/premium'),
    plans: [
      { id: 'individual', name: 'Individual', prices: [m(189)] },
      {
        id: 'family',
        name: 'Family',
        seats: 6,
        prices: [m(379)],
        note: 'You plus up to 5 family members in your household.',
      },
      { id: 'student', name: 'Student', prices: [m(115)] },
      { id: 'lite', name: 'Premium Lite', prices: [m(109)] },
    ],
  },
  {
    id: 'youtube-music',
    name: 'YouTube Music Premium',
    category: 'entertainment',
    logo: 'youtubemusic',
    source: src('https://www.youtube.com/musicpremium'),
    plans: [
      { id: 'individual', name: 'Individual', prices: [m(149)] },
      { id: 'family', name: 'Family', seats: 6, prices: [m(239)] },
      { id: 'student', name: 'Student', prices: [m(75)] },
    ],
  },
  {
    id: 'apple-music',
    name: 'Apple Music',
    category: 'entertainment',
    logo: 'applemusic',
    source: src('https://www.apple.com/ph/apple-music/'),
    plans: [
      { id: 'individual', name: 'Individual', prices: [m(169)] },
      { id: 'family', name: 'Family', seats: 6, prices: [m(279)] },
      { id: 'student', name: 'Student', prices: [m(85)] },
    ],
  },
  {
    id: 'apple-tv',
    name: 'Apple TV',
    category: 'entertainment',
    logo: 'appletv',
    keywords: ['apple tv+', 'apple tv plus'],
    source: src('https://www.apple.com/ph/apple-tv-plus/'),
    plans: [{ id: 'monthly', name: 'Apple TV', prices: [m(369)] }],
  },
  {
    id: 'apple-one',
    name: 'Apple One',
    category: 'entertainment',
    logo: 'apple',
    source: src('https://www.apple.com/ph/apple-one/'),
    plans: [
      {
        id: 'individual',
        name: 'Individual',
        prices: [m(499)],
        note: 'iCloud+ 50 GB, Apple TV, Apple Music and Apple Arcade.',
      },
      {
        id: 'family',
        name: 'Family',
        seats: 6,
        prices: [m(629)],
        note: 'iCloud+ 200 GB, shared with up to five people.',
      },
    ],
  },
  {
    id: 'prime-video',
    name: 'Prime Video',
    category: 'entertainment',
    keywords: ['amazon'],
    source: src('https://www.primevideo.com/'),
    plans: [{ id: 'prime-video', name: 'Prime Video', prices: [m(249), y(1669)] }],
  },
  {
    id: 'hbo-max',
    name: 'HBO Max',
    category: 'entertainment',
    logo: 'hbomax',
    source: src('https://www.hbomax.com/ph/en'),
    plans: [
      { id: 'mobile', name: 'Mobile', prices: [m(149), y(1040)] },
      { id: 'standard', name: 'Standard', prices: [m(269), y(1890)] },
      { id: 'premium', name: 'Premium', prices: [m(399), y(2790)] },
    ],
  },
  {
    id: 'viu',
    name: 'Viu Premium',
    category: 'entertainment',
    keywords: ['kdrama', 'korean'],
    plans: [unverified('premium', 'Premium', 'Viu does not publish its Philippine price on the web. Enter what you pay.')],
  },
  {
    id: 'iwanttfc',
    name: 'iWantTFC',
    category: 'entertainment',
    keywords: ['iwant', 'abs-cbn', 'tfc'],
    source: src('https://help.iwanttfc.com/support/solutions/articles/61000312939-how-much-is-the-basic-plan-for-philippine-subscribers-'),
    plans: [
      {
        id: 'basic',
        name: 'Basic (with ads)',
        prices: [m(35), y(315)],
        note: 'From iWant’s help centre, last updated 16 July 2024.',
      },
      unverified('premium', 'Premium', 'No current Philippine Premium price is published. Enter what you pay.'),
    ],
  },
  {
    id: 'crunchyroll',
    name: 'Crunchyroll',
    category: 'entertainment',
    logo: 'crunchyroll',
    keywords: ['anime'],
    plans: [unverified('fan', 'Fan', IN_APP), unverified('mega-fan', 'Mega Fan', IN_APP)],
  },
  {
    id: 'viva-one',
    name: 'Viva One',
    category: 'entertainment',
    keywords: ['vivamax', 'viva'],
    plans: [unverified('premium', 'Subscription', IN_APP)],
  },

  /* ---------------- Cloud and productivity ---------------- */
  {
    id: 'google-one',
    name: 'Google One',
    category: 'productivity',
    logo: 'google',
    keywords: ['google drive', 'storage', 'gmail'],
    source: src('https://one.google.com/about/plans'),
    plans: [
      { id: 'lite', name: 'Lite (30 GB)', prices: [m(49), y(490)] },
      {
        id: 'basic',
        name: 'Basic (100 GB)',
        seats: 6,
        prices: [m(119), y(1190)],
        note: 'Storage can be shared with up to 5 others.',
      },
    ],
  },
  {
    id: 'icloud',
    name: 'iCloud+',
    category: 'productivity',
    logo: 'icloud',
    keywords: ['apple storage', 'icloud plus'],
    source: src('https://support.apple.com/en-us/108047'),
    plans: [
      { id: '50gb', name: '50 GB', prices: [m(59)] },
      { id: '200gb', name: '200 GB', prices: [m(199)] },
      { id: '2tb', name: '2 TB', prices: [m(699)] },
      { id: '6tb', name: '6 TB', prices: [m(1990)] },
      { id: '12tb', name: '12 TB', prices: [m(3990)] },
    ],
  },
  {
    id: 'microsoft-365',
    name: 'Microsoft 365',
    category: 'productivity',
    keywords: ['office', 'word', 'excel', 'onedrive', 'copilot'],
    source: src('https://www.microsoft.com/en-ph/microsoft-365/buy/compare-all-microsoft-365-products'),
    plans: [
      { id: 'personal', name: 'Personal', prices: [m(489), y(4899)] },
      { id: 'family', name: 'Family', seats: 6, prices: [m(609), y(6099)] },
      { id: 'premium', name: 'Premium', seats: 6, prices: [m(1099), y(10999)] },
    ],
  },
  {
    id: 'onedrive',
    name: 'OneDrive Standalone',
    category: 'productivity',
    keywords: ['microsoft storage'],
    note: 'OneDrive storage also comes with Microsoft 365.',
    plans: [unverified('100gb', '100 GB', 'Microsoft’s Philippine OneDrive price page was unavailable. Enter what you pay.')],
  },
  {
    id: 'dropbox',
    name: 'Dropbox',
    category: 'productivity',
    logo: 'dropbox',
    source: src('https://www.dropbox.com/plans'),
    note: 'Dropbox lists US dollar prices in the Philippines.',
    plans: [
      { id: '500gb', name: 'Dropbox 500 GB', prices: [], usd: [usdM(5.99)] },
      { id: 'plus', name: 'Plus', prices: [], usd: [usdM(9.99)] },
    ],
  },
  {
    id: 'notion',
    name: 'Notion',
    category: 'productivity',
    logo: 'notion',
    source: src('https://www.notion.com/pricing'),
    note: 'Notion lists US dollar prices.',
    plans: [
      {
        id: 'plus',
        name: 'Plus',
        prices: [],
        usd: [usdM(10)],
        note: 'Per seat, as shown on the pricing page.',
      },
    ],
  },
  {
    id: 'evernote',
    name: 'Evernote',
    category: 'productivity',
    logo: 'evernote',
    source: src('https://evernote.com/compare-plans'),
    plans: [
      { id: 'starter', name: 'Starter', prices: [y(1499)] },
      { id: 'advanced', name: 'Advanced', prices: [y(3799)] },
    ],
  },
  {
    id: 'grammarly',
    name: 'Grammarly',
    category: 'productivity',
    logo: 'grammarly',
    source: src('https://www.grammarly.com/plans'),
    plans: [
      {
        id: 'plus',
        name: 'Plus',
        prices: [m(350), { billing: 'quarterly', pesos: 700 }, y(1700)],
        note: 'A plan Grammarly offers only in the Philippines.',
      },
      {
        id: 'pro',
        name: 'Pro',
        prices: [],
        usd: [usdM(30), { billing: 'quarterly', dollars: 60 }, usdY(144)],
      },
    ],
  },
  {
    id: 'canva',
    name: 'Canva',
    category: 'productivity',
    keywords: ['design'],
    source: src('https://www.canva.com/en_ph/pricing/'),
    plans: [
      {
        id: 'pro',
        name: 'Pro',
        prices: [m(300)],
        note: 'Canva also sells a yearly plan; its Philippine price was not shown. Enter it if that is what you pay.',
      },
      {
        id: 'business',
        name: 'Business',
        prices: [m(420)],
        note: 'Per person.',
      },
    ],
  },
  {
    id: 'adobe',
    name: 'Adobe Creative Cloud',
    category: 'productivity',
    keywords: ['photoshop', 'illustrator', 'premiere', 'lightroom', 'acrobat'],
    source: src('https://www.adobe.com/ph_en/creativecloud/plans.html'),
    note: 'Adobe’s listed prices are for a yearly commitment paid monthly, VAT included.',
    plans: [
      {
        id: 'cc-pro',
        name: 'Creative Cloud Pro',
        prices: [
          {
            billing: 'monthly',
            pesos: 2399,
            promo: {
              pesos: 959.36,
              note: 'First-year offer, ends 27 Nov 2026',
            },
          },
        ],
      },
      { id: 'photography', name: 'Photography (1 TB)', prices: [m(839)] },
      { id: 'photoshop', name: 'Photoshop', prices: [m(649)] },
      { id: 'illustrator', name: 'Illustrator', prices: [m(649)] },
      { id: 'premiere', name: 'Adobe Premiere', prices: [m(649)] },
      { id: 'acrobat-pro', name: 'Acrobat Pro', prices: [m(1399)] },
      { id: 'express', name: 'Adobe Express Premium', prices: [m(349)] },
    ],
  },

  /* ---------------- AI tools ---------------- */
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    category: 'ai',
    keywords: ['openai', 'gpt'],
    source: src('https://chatgpt.com/pricing'),
    plans: [
      { id: 'go', name: 'Go', prices: [m(300)] },
      { id: 'plus', name: 'Plus', prices: [m(1100)] },
      {
        id: 'pro',
        name: 'Pro (lowest tier)',
        prices: [m(6490)],
        note: 'Pro has three usage tiers; only the lowest is priced on the page. Enter yours if you pay for a higher tier.',
      },
    ],
  },
  {
    id: 'claude',
    name: 'Claude',
    category: 'ai',
    logo: 'claude',
    keywords: ['anthropic'],
    source: src('https://claude.com/pricing'),
    note: 'Claude lists US dollar prices.',
    plans: [
      { id: 'pro', name: 'Pro', prices: [], usd: [usdM(20), usdY(200)] },
      { id: 'max', name: 'Max', prices: [], usd: [usdM(100)] },
      { id: 'ultra', name: 'Ultra', prices: [], usd: [usdM(200)] },
    ],
  },
  {
    id: 'google-ai-pro',
    name: 'Google AI Pro',
    category: 'ai',
    logo: 'googlegemini',
    keywords: ['gemini', 'google one ai'],
    source: src('https://one.google.com/about/plans'),
    plans: [
      {
        id: 'ai-pro',
        name: 'Google AI Pro (5 TB)',
        seats: 6,
        prices: [m(1100), y(10900)],
      },
    ],
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    category: 'ai',
    logo: 'perplexity',
    source: src('https://www.perplexity.ai/pro'),
    note: 'Perplexity lists US dollar prices.',
    plans: [
      {
        id: 'pro',
        name: 'Pro',
        prices: [],
        usd: [usdY(204)],
        note: 'Shown as $17 a month, billed yearly.',
      },
      {
        id: 'max',
        name: 'Max',
        prices: [],
        usd: [usdY(2004)],
        note: 'Shown as $167 a month, billed yearly.',
      },
    ],
  },
  {
    id: 'github-copilot',
    name: 'GitHub Copilot',
    category: 'ai',
    logo: 'githubcopilot',
    source: src('https://github.com/features/copilot/plans'),
    note: 'GitHub lists US dollar prices.',
    plans: [
      { id: 'pro', name: 'Pro', prices: [], usd: [usdM(10)] },
      { id: 'pro-plus', name: 'Pro+', prices: [], usd: [usdM(39)] },
      { id: 'max', name: 'Max', prices: [], usd: [usdM(100)] },
    ],
  },

  /* ---------------- Gaming ---------------- */
  {
    id: 'apple-arcade',
    name: 'Apple Arcade',
    category: 'gaming',
    logo: 'applearcade',
    source: src('https://www.apple.com/ph/apple-one/'),
    plans: [{ id: 'monthly', name: 'Apple Arcade', prices: [m(369)] }],
  },
  {
    id: 'xbox-game-pass',
    name: 'Xbox Game Pass',
    category: 'gaming',
    note: 'Not officially sold in the Philippines (no Philippine Xbox store page). Enter what you pay if you subscribe through another region.',
    plans: [unverified('ultimate', 'Ultimate'), unverified('pc', 'PC Game Pass')],
  },
  {
    id: 'ps-plus',
    name: 'PlayStation Plus',
    category: 'gaming',
    logo: 'playstation',
    note: 'PlayStation’s Philippine site says PS Plus is not available here. Enter what you pay if you subscribe through another region.',
    plans: [unverified('essential', 'Essential'), unverified('extra', 'Extra'), unverified('premium', 'Premium')],
  },
  {
    id: 'nintendo-switch-online',
    name: 'Nintendo Switch Online',
    category: 'gaming',
    note: 'Nintendo has no Philippine eShop. Enter what you pay through another region’s eShop.',
    plans: [unverified('individual', 'Individual'), unverified('family', 'Family')],
  },
  {
    id: 'roblox',
    name: 'Roblox Premium',
    category: 'gaming',
    logo: 'roblox',
    plans: [unverified('premium', 'Premium', IN_APP)],
  },
  {
    id: 'discord-nitro',
    name: 'Discord Nitro',
    category: 'gaming',
    logo: 'discord',
    plans: [unverified('basic', 'Nitro Basic', IN_APP), unverified('nitro', 'Nitro', IN_APP)],
  },

  /* ---------------- Lifestyle and learning ---------------- */
  {
    id: 'tinder',
    name: 'Tinder',
    category: 'lifestyle',
    logo: 'tinder',
    plans: [unverified('plus', 'Plus', IN_APP), unverified('gold', 'Gold', IN_APP), unverified('platinum', 'Platinum', IN_APP)],
  },
  {
    id: 'bumble',
    name: 'Bumble',
    category: 'lifestyle',
    plans: [unverified('premium', 'Premium', IN_APP)],
  },
  {
    id: 'duolingo',
    name: 'Duolingo Super',
    category: 'lifestyle',
    logo: 'duolingo',
    keywords: ['language'],
    plans: [unverified('super', 'Super', IN_APP), unverified('family', 'Super Family', IN_APP)],
  },
  {
    id: 'strava',
    name: 'Strava',
    category: 'lifestyle',
    logo: 'strava',
    keywords: ['running', 'cycling'],
    plans: [unverified('subscription', 'Subscription', IN_APP)],
  },
  {
    id: 'linkedin',
    name: 'LinkedIn Premium',
    category: 'lifestyle',
    keywords: ['jobs'],
    plans: [unverified('career', 'Career', 'Priced after you sign in. Enter what you pay.')],
  },
  {
    id: 'pandapro',
    name: 'foodpanda pro',
    category: 'lifestyle',
    logo: 'foodpanda',
    keywords: ['pandapro', 'food delivery'],
    plans: [unverified('pro', 'pandapro', IN_APP)],
  },
  {
    id: 'grabunlimited',
    name: 'GrabUnlimited',
    category: 'lifestyle',
    logo: 'grab',
    keywords: ['grab food', 'delivery'],
    plans: [unverified('unlimited', 'GrabUnlimited', IN_APP)],
  },
]

export const serviceById = (id: string) => SERVICES.find((s) => s.id === id)

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9+ ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/** Name first, then keywords, then plan names. */
export function searchServices(query: string, limit = 8): Service[] {
  const q = norm(query)
  if (!q) return []
  const scored: { s: Service; score: number; i: number }[] = []
  SERVICES.forEach((s, i) => {
    const name = norm(s.name)
    const kw = (s.keywords ?? []).map(norm)
    let score = 0
    if (name === q) score = 100
    else if (name.startsWith(q)) score = 80
    else if (name.split(' ').some((w) => w.startsWith(q))) score = 60
    else if (kw.some((k) => k.startsWith(q) || k.split(' ').some((w) => w.startsWith(q)))) score = 50
    else if (s.plans.some((p) => norm(p.name).startsWith(q))) score = 20
    if (score) scored.push({ s, score, i })
  })
  return scored
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .slice(0, limit)
    .map((x) => x.s)
}

/** The official peso price of a plan for one billing period, if published. */
export const officialPrice = (plan: Plan | undefined, billing: Billing) => plan?.prices.find((p) => p.billing === billing)
/** The billing a plan is first sold at, for its default. */
const firstBilling = (plan: Plan | undefined): Billing => plan?.prices[0]?.billing ?? plan?.usd?.[0]?.billing ?? 'monthly'

/** Draft for a directory plan at its first official price. */
export function draftFor(
  service: Service,
  plan: Plan,
): {
  serviceId: string
  planId: string
  name: string
  planName: string
  billing: Billing
  price: number
  category: SubCategory
} {
  const billing = firstBilling(plan)
  return {
    serviceId: service.id,
    planId: plan.id,
    name: service.name,
    planName: plan.name,
    billing,
    price: officialPrice(plan, billing)?.pesos ?? 0,
    category: service.category,
  }
}
