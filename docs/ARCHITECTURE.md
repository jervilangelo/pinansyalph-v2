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

### Validation rules

- **Inflation**: consecutive months with no gaps, no future months, latest month no older than six months, values
  within plausible bounds, and never older than the stored latest month.
- **Fuel**: every fuel must be read with confidence (or explicitly "no change"); otherwise that PDF is skipped. Each
  week's change in DOE's official year-to-date total must fall inside that week's reported range.
- **Banks**: a product whose evidence text disappears is marked `needs-review`; one older than 45 days since manual
  verification is marked `stale`. The interface shows both states and keeps the last verified rate.

## Front end

- React 19 + TypeScript, Vite, Tailwind CSS v4, Motion, Recharts (lazy-loaded), Lucide icons.
- One page with anchored sections: no client router, so GitHub Pages needs no 404 fallback.
- One shared scenario (amounts, duration, inflation assumption) drives the MP2, bank and comparison calculators so they
  are always compared on the same inputs.
- Charts load after first paint; reduced-motion preferences remove all travel and count-ups.

## Folders

```
src/
  calculators/   pure, decimal-safe financial logic + unit tests
  charts/        Recharts components (lazy) and shared chart styling
  components/    page sections and UI primitives
  data/          versioned datasets (JSON) and typed accessors
  hooks/         shared scenario state
  types/         zod schemas = the data contracts
  utils/         formatting
scripts/         fetchers, parsers, validators + tests
e2e/             Playwright browser tests
docs/            methodology, architecture, screenshots, image credits
.github/workflows/
```
