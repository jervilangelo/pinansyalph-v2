# Toll data: sources, checks and updates

"Magkano ang Toll Ko?" uses the expressway toll rates approved by the Toll Regulatory Board (TRB). This note records
where the figures in [`src/data/tolls.json`](../src/data/tolls.json) come from, how they were checked, what is
missing, and how to update them.

## Where the figures come from

TRB publishes a toll matrix (entry plaza × exit plaza × vehicle class, VAT inclusive) for each expressway on
[trb.gov.ph](https://trb.gov.ph/index.php/toll-rates). The site sits behind a bot challenge and its `robots.txt`
disallows automated agents, so it was not fetched automatically. The operators' own sites (NLEX, TPLEX, SLEX, STAR,
NAIAX) also disallow crawling.

[ExpresswayPH](https://expresswayph.com/) publishes transcriptions of the TRB matrices on its public pages. Its
`robots.txt` allows those pages and disallows only `/api`, which was not used. ExpresswayPH has no open-source licence
("All rights reserved"), so none of its code was used: only the toll rates themselves, which are figures set by TRB.
They were read on 18 November 2026 by parsing the published files as text, without running them.

PinansyalPH's dataset format, plaza names, search keywords, connections between expressways, RFID mapping and
calculation engine ([`src/calculators/toll.ts`](../src/calculators/toll.ts)) were written for this project.

## How they were checked

Every fare below matches an independent source. The build fails if any of them stops matching (`checks` in the
dataset, enforced by the unit tests):

| Trip | Class 1 / 2 / 3 | Source |
| --- | --- | --- |
| NLEX Balintawak → Sta. Ines | ₱440 / ₱1,099 / ₱1,319 | [Inquirer](https://newsinfo.inquirer.net/2170419/nlex-to-charge-higher-toll-rates-on-jan-20), [GMA](https://www.gmanetwork.com/regionaltv/news/112496/nlex-toll-fees-go-up-starting-january-20-2026/story/), [Top Gear](https://www.topgear.com.ph/news/motoring-news/nlex-toll-increase-january-2026-a6888-20260119): TRB rates from 20 Jan 2026 |
| NLEX Balintawak → Marilao (open system) | ₱85 / ₱211 / ₱254 | Same reports |
| SLEX Alabang → Calamba | ₱137 / ₱274 / ₱411 | [Philstar](https://www.philstar.com/headlines/2026/06/28/2538358/slex-star-toll-increase-july-1), [GMA](https://www.gmanetwork.com/news/money/motoring/992933/slex-star-2nd-tranche-of-toll-hike-to-take-effect-july-1-trb/story/): TRB rates from 1 Jul 2026 |
| SLEX Alabang → Sto. Tomas | ₱174 (Class 1) | Same reports |
| STAR Sto. Tomas → Batangas City | ₱121 (Class 1) | [Inquirer](https://newsinfo.inquirer.net/2253715/2nd-part-of-adjusted-slex-star-tollway-rates-effective-july-1-trb) |
| TPLEX La Paz → Rosario | ₱311 / ₱778 / ₱933 | Several 2026 guides citing the TRB matrix |
| Skyway Stage 3 Buendia → NLEX | ₱264 / ₱528 / ₱792 | [Yugatech](https://www.yugatech.com/news/trb-approves-provisional-toll-rates-for-skyway-stage-3/): TRB provisional rates |

Multi-expressway totals also match ExpresswayPH's published route guides (Class 1): Balintawak → Batangas ₱723,
Balintawak → Calamba ₱565, Quezon Avenue → Alabang ₱428, Skyway → Calamba ₱301. These are unit tests too.

Each expressway in the data carries a `confidence`:

- **cross-checked**: NLEX–SCTEX, Skyway–SLEX, STAR, TPLEX
- **single-source**: CALAX (effective 8 Feb 2024), CAVITEX (28 Oct 2025), NLEX Connector (15 Oct 2024)
- **provisional**: Skyway Stage 3 (TRB provisional rates, 2021)

The page shows this next to every result that uses one of those roads.

### Discrepancies found

- **Balintawak → Tipo (Subic)**: some sites list ₱479 or ₱607–₱634 for Class 1. The current integrated NLEX–SCTEX
  matrix gives ₱857, which most 2026 sources agree on. The lower figures appear to be older or to stop at a different
  exit.
- **Balintawak → Sta. Ines**: one calculator lists ₱411 (the Balintawak → Dau fare). News reports of the TRB approval
  give ₱440, which the data uses.
- **TPLEX Class 2** is about 2.5× Class 1 (₱778 vs ₱311), higher than on other roads. Several independent guides
  confirm the figure.

## Calculation

- Each expressway charges from where you enter it to where you leave it, from its own matrix and your vehicle class.
- NLEX and SCTEX are one integrated matrix, and so are the Skyway (Stages 1 and 2) and SLEX, so a trip within either
  is one fare and is never charged twice.
- A trip across expressways is split where the roads meet, one fare per road:
  - NLEX–SCTEX Tarlac ↔ TPLEX La Paz
  - NLEX Balintawak ↔ Skyway Stage 3
  - Skyway Stage 3 Buendia ↔ Skyway
  - SLEX Sto. Tomas ↔ STAR
  - SLEX Mamplasan ↔ CALAX
- The route between roads is found by breadth-first search (fewest expressways). Today the network is a chain, so
  there is only one route.
- A pair with no published fare is reported as not possible rather than estimated. Some ramps only run one way.
- A round trip computes the return on its own.
- The RFID amounts add up the legs paid through each account:
  - **Easytrip**: NLEX–SCTEX, NLEX Connector, CALAX, CAVITEX
  - **Autosweep**: Skyway Stage 3, Skyway–SLEX, STAR, TPLEX
- Fuel is distance ÷ km per litre × price per litre, all entered by the visitor. The site publishes DOE price
  adjustments, not pump prices, so it does not fill in a price.

## Not included

- **NAIAX**: published as two flat segment rates, not an entry and exit matrix.
- **NLEX Harbor Link**: the only figures found were themselves taken from Wikipedia and could not be traced to a TRB
  matrix.
- **MCX as its own road**: no matrix. SLEX trips to the MCX exit are included.
- **CAVITEX**: only pairs with a published fare can be computed. The CAVITEX–NAIAX and NLEX Connector–Harbor Link links
  are not modelled.

## Updating the rates

There is no scheduled job, because no source with a published fare matrix allows automated access.

When TRB approves new rates:

1. Get the new matrix from TRB's published notice or the operator's advisory.
2. In `src/data/tolls.json`, update that expressway's `fares` (rows and columns follow `plazas`, `null` where no fare
   is published), `effective` (ISO date), `basis` and `confidence`.
3. Update `checks` with at least one fare confirmed by an independent report, and set `compiledOn`.
4. Run `npm run validate:data` and `npm test`. Both check matrix shape, whole positive pesos, class order and every
   recorded check.

To add a road, add an expressway with its plazas and matrices, and a `connections` entry for each junction. The
routing picks it up with no code changes.
