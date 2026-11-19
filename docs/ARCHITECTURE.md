# Architecture

A static site with versioned data. No server, no database, no accounts.

```
             ┌──────────────── GitHub Actions: update-economic-data (daily) ────────────────┐
             │                                                                              │
 PSA OpenSTAT (PxWeb API) ─► scripts/fetch-inflation.ts ─┐                                  │
 DOE Oil Monitor (PDFs) ───► scripts/fetch-fuel-prices.ts ┼─► validate (zod) ─► src/data/*.json ─► commit
 Pag-IBIG (watch only) ────► scripts/fetch-mp2-rates.ts  ─┤        on failure: keep previous file, report
 Bank pages (check only) ──► scripts/fetch-bank-rates.ts ─┘                                  │
             └──────────────────────────────────────────────────────────────────────────────┘
                                         │ workflow_run
                                         ▼
             GitHub Actions: deploy ─► validate, lint, unit + browser tests ─► vite build ─► GitHub Pages
```

## Why this shape

- **Static first.** Every figure on the page is known at build time. Bundling the JSON means the first paint already
  has real numbers, there is no API to fail at visit time, and hosting is free on GitHub Pages.
- **Data as code.** Datasets live in git, so every change is a reviewable diff with a date. History is kept: inflation
  series since 2019, every weekly fuel adjustment, every MP2 rate since 2011.
- **Fetch, validate, then publish.** Each fetcher builds the complete new dataset, validates it against the schema in
  [`src/types/data.ts`](../src/types/data.ts), and writes only if validation passes and the content changed. A failed
  source leaves the previous file untouched.

## Source by source

| Dataset | Source | Method | Automation |
| --- | --- | --- | --- |
| Inflation | PSA OpenSTAT, 2018-based CPI tables | PxWeb JSON API; tables discovered by title | Auto-publish after validation |
| Fuel | DOE Oil Monitor (weekly PDF) | PDF text via pdf.js, clause parser, YTD cross-check | Auto-publish after validation |
| MP2 rates | Pag-IBIG declarations | Site is behind a browser challenge | Watch only: flags when a new year's rate is due |
| Bank rates | Each bank's official page or disclosure PDF | Evidence text check | Never auto-publishes rates; flags `needs-review` or `stale` |
| Payroll rules | SSS, PhilHealth, HDMF circulars; BIR RR 11-2018 | Versioned config with `effectiveFrom` dates | Updated by hand when an agency issues a new schedule |

### Validation rules

- **Inflation**: consecutive months with no gaps, no future months, latest month no older than six months, values
  within plausible bounds, and never older than the stored latest month.
- **Fuel**: every fuel must be read with confidence (or explicitly "no change"); otherwise that PDF is skipped. Each
  week's change in DOE's official year-to-date total must fall inside that week's reported range.
- **Banks**: a product whose evidence text disappears is marked `needs-review`; one older than 45 days since manual
  verification is marked `stale`. The interface shows both states and keeps the last verified rate.

## Front end

- React 19 + TypeScript, Vite, Tailwind CSS v4, Motion, Recharts (lazy-loaded), Lucide icons.
- One page per tool (`/sweldo`, `/13th-month`, `/mp2`, `/banks`, `/compare`, `/inflation`, `/gas`, `/about`) with a small
  History-API router in `src/router.tsx` (no dependency); routes and page metadata live in `src/routes.ts`. The build
  writes `<route>.html` (GitHub Pages serves it at the clean URL `/<route>` with a 200), a `<route>/index.html` copy for old
  trailing-slash links, a noindex `404.html` fallback, `sitemap.xml` and `robots.txt`, each page with its own canonical
  URL on https://pinansyalph.site. The router rewrites `/mp2/`, `/mp2.html` and `/pinansyalph-v2/mp2` to `/mp2`.
- Languages: English (default), Filipino and Bisaya. Code uses English source text as keys (`t()`, `tx()` for text with
  inline elements, `tv()` for labels from data); `src/i18n/fil.json` and `ceb.json` hold translations, `en.json` English
  overrides for Taglish source text. Calculator messages stay in English and are translated at display time through
  the pattern keys in `src/i18n/patterns.json`. `src/__tests__/i18n.test.ts` fails on any untranslated key.
- Appearance: light (default) and dark, as CSS custom properties switched by `data-theme` on <html>; an inline script in
  `index.html` applies the saved theme before first paint. Language and theme are the only things saved for settings
  (`pinansyalph-language`, `pinansyalph-theme` in localStorage).
- One shared scenario (amounts, duration, inflation assumption) lives above the router and drives the MP2, bank and
  comparison pages, so they are always compared on the same inputs as you move between them.
- Charts load after first paint; reduced-motion preferences remove all travel and count-ups.
- **v3 design system**: tokens in `src/index.css` (`@theme`), motion tokens in `src/components/ui/motion.tsx`, and
  shared primitives: `Disclosure`, `Modal`, `ResultHero`/`Stat`/`CalcGrid`/`Panel` (`src/components/ui`), the brand
  symbol and loaders (`src/components/brand/Logo.tsx`), the page shell and `ToolHeader`
  (`src/components/layout`). Tools are grouped in `GROUPS`/`TOOLS` in `src/router.tsx`.
- **Underpaid ba ko?** (`/underpaid-ba-ko`): PSA OWS figures in `src/data/salary-benchmarks.json` (fetched by
  `scripts/update-salary-data.ts`, contract in `src/types/salary.ts`), job-title mapping in
  `src/data/salaryOccupations.ts`, pure logic in `src/calculators/salaryBenchmark.ts` and `src/calculators/jobOffer.ts`
  (which reuses the payroll engine). Community submissions are designed but not built: docs/COMMUNITY-SALARY-DATA.md.
- **Splash**: plain HTML/CSS in `index.html`, dismissed by `markAppReady()` (`src/splash.ts`) once a page has mounted,
  with a CSS fail-safe. The homepage estimator passes its salary to `/sweldo` as `?basic=`; nothing else is read from
  the URL.

## Folders

```
src/
  calculators/   pure, decimal-safe financial logic + unit tests
  charts/        Recharts components (lazy) and shared chart styling
  components/    page sections, layout (header, footer, page shell), brand, support dialog, UI primitives
  kit/           brand kit: logo SVGs and PNGs, web icons (source of public/ icons)
  pages/         one component per route
  router.tsx     routes, links and navigation
  data/          versioned datasets (JSON) and typed accessors
  hooks/         shared scenario state
  types/         zod schemas = the data contracts
  utils/         formatting
scripts/         fetchers, parsers, validators + tests
e2e/             Playwright browser tests
docs/            methodology, architecture, screenshots, image credits
.github/workflows/
```
