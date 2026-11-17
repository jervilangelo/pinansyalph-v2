# PinansyalPH 3.0

Version 3 is a complete redesign of the interface. The calculation engine (`src/calculators`), the datasets (`src/data`), the data scripts and both GitHub workflows are unchanged, and the 111 calculator and dataset unit tests pass without modification.

Version 2 is preserved as the tag `v2-final` and the branch `v2-archive`.

## Design

- **Brand.** The new logo kit (`src/kit`) is used everywhere: the horizontal lockup in the header, the wordmark in the footer, the small-size symbol for loaders, and the kit's favicons, app icons, maskable icon, web manifest and Open Graph image.
- **Palette.** Warm off-white ground `#F6F4EF`, white panels, ink `#151514`, brand blue `#1D4E89` for actions and answers. Sun gold `#EDA100` is decorative only, as the kit specifies (it fails contrast as text).
- **Type.** Literata, the wordmark's face, for headlines and peso figures; Instrument Sans for interface and reading text.
- **Surfaces.** Panels are separated by tone, not lines or shadows. Only floating things (menus, dialogs) carry a shadow.

## Experience

- **Homepage**: the tagline *Mas malinaw ang pera mo.*, a live take-home pay estimator, the tools grouped as *Sahod*, *Ipon* and *Presyo*, the latest official numbers with their sources and dates, and an open-source note.
- **Navigation**: one Tools menu (desktop panel, full-screen phone sheet), About, Support, and a primary action. Escape closes menus and returns focus.
- **Tool pages** share one structure: breadcrumb, the question as the title, one plain sentence, an inputs panel and the answer in a blue result block (sticky on desktop, a result bar on phones). Breakdowns, tables, methodology and secondary charts are disclosures.
- **Sweldo** is split into two steps: take-home pay first, then an optional monthly budget. The budget result stays quiet until a bill is added, and the "invest what is left" projection appears only once there is a budget.
- **About** explains the project and opens a **Support PinansyalPH** dialog: *Star on GitHub* opens the repository in a new tab (the site cannot star it for anyone) and *View Developer Portfolio* opens jervilangelo.online.

## Motion

- Shared tokens in `src/components/ui/motion.tsx`: one easing family, three durations, a spring for sliding indicators, and a collapse preset for disclosures.
- **Animated logo**: the baseline draws out, the sun rises over the horizon, then the five rays rise left to right like a growing bar chart. Only transforms and opacity, with origins in the symbol's own viewBox, so the logo is never distorted.
- **Splash** (`index.html`): plain HTML and CSS, so it paints before JavaScript. It leaves when a real page has mounted and fonts are ready (capped at 1.2s). The first visit in a tab lets the reveal finish (about 1.1s); reloads show nothing unless loading takes longer than 350ms. A CSS fail-safe hides it after 8 seconds whatever happens. With reduced motion the logo is static.
- **Route loader**: the small-size symbol with its rays pulsing in order, shown only if a page takes more than 200ms to load.
- Animated numbers announce the settled value to screen readers, not the animation frames.

## Accessibility

- Skip link, visible focus rings, labelled fields, native radios and checkboxes under the segmented controls and switches.
- The support dialog moves focus in, traps it, closes on Escape, the close button or the backdrop, and returns focus to the trigger.
- Every disclosure is a button with `aria-expanded` and `aria-controls`.
- `prefers-reduced-motion` removes travel everywhere and keeps every piece of content.

## Testing

- `npm test`: 111 unit tests pass (unchanged).
- `npm run test:e2e`: 57 browser tests pass, including no horizontal overflow on every route at 360, 390, 768, 1024, 1366 and 1920px, the splash leaving and its quick path on reload, the support dialog's focus handling, the homepage estimator hand-off, and direct loads and refreshes of nested routes.
- Visual review by screenshot at 320, 375, 390, 768, 1024, 1440 and 1920px.

## Known limitations

- The repository has no LICENSE file. The site describes the project as open source because the code is public, but a licence should be added to make reuse terms explicit.
- Recharts makes up most of the lazily loaded chart chunk; charts load only when a tool needs them.
