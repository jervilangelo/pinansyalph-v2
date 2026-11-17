# Electricity rates: sources, checks and updates

"Magkano Kuryente Ko?" prices a residential electricity bill from the utility's own published rates for the billing
month. This note covers [`src/data/electricity.json`](../src/data/electricity.json).

## Source

Meralco publishes two documents every month on
[meralco.com.ph/residential/rates-and-charges](https://www.meralco.com.ph/residential/rates-and-charges):

- **Summary Schedule of Rates**: every rate component, by customer class, with VAT rates.
- **Residential Bills at Typical Consumption Levels**: worked bills, line by line, at 50 to 5,000 kWh, for lifeline
  and non-lifeline customers.

| Billing month | Rate at 200 kWh | Sources |
| --- | --- | --- |
| November 2026 | ₱15.5510/kWh | [Schedule](https://www.meralco.com.ph/uploads/documents/11-2026-Rate-Schedule-1.pdf), [bills](https://www.meralco.com.ph/uploads/documents/11-2026-Residential-Bills-1.pdf) |
| October 2026 | ₱15.0615/kWh | [Schedule](https://meralcomain.s3.ap-southeast-1.amazonaws.com/2026-10/10-2026_rate_schedule.pdf), [bills](https://meralcomain.s3.ap-southeast-1.amazonaws.com/2026-10/10-2026_residential_bills.pdf) |
| September 2026 | ₱14.7424/kWh | [Schedule](https://meralcomain.s3.ap-southeast-1.amazonaws.com/2026-09/09-2026_rate_schedule.pdf), [bills](https://meralcomain.s3.ap-southeast-1.amazonaws.com/2026-09/09-2026_residential_bills.pdf) |
| August 2026 | ₱14.7833/kWh | [Schedule](https://meralcomain.s3.ap-southeast-1.amazonaws.com/2026-08/08-2026_rate_schedule.pdf), [bills](https://meralcomain.s3.ap-southeast-1.amazonaws.com/2026-08/08-2026_residential_bills.pdf) |

The 200 kWh rates match the figures Meralco announced each month.

The Energy Regulatory Commission's site (erc.gov.ph) sits behind a bot challenge and was not used. The ERC approves
the distribution rates and refunds; Meralco's schedule cites the ERC decision for each component.

## What is stored per month

- **Per kWh**:
  - generation, transmission, ancillary service, system loss
  - supply, metering
  - each ERC-ordered refund
  - regulatory reset adjustment, lifeline rate adjustment
  - senior citizen subsidy, lifeline subsidy
  - real property tax and its adjustment
  - the four universal charges, each rounded on its own
  - FIT-All, GEA-All
  - Meralco's average local franchise tax adjustment
- **Distribution tiers**: 0–200, 201–300, 301–400 and over 400 kWh. The whole month is charged at its tier.
- **Fixed charges per month**: supply and metering. November 2026: ₱17.00 and ₱6.00.
- **VAT rates** as published: generation, transmission, ancillary service, system loss, and 12% on the other charges.
- **Energy tax** (first 650 kWh free, then ₱0.10, ₱0.20 and ₱0.35 per kWh by block).
- **Lifeline discounts**: 100%, 35% and 20% up to 50, 70 and 100 kWh.
- **Meralco's own worked bills**, kept so every check can be rerun.

## How it is checked

[`scripts/update-electricity-rates.ts`](../scripts/update-electricity-rates.ts) reads the residential rates from
the bills table. It then recomputes all 18 of Meralco's worked bills for the month with
[`src/calculators/electricity.ts`](../src/calculators/electricity.ts), and writes nothing if any of them is off. The
same check runs in `npm run validate:data` and the unit tests, so a later code change cannot break it silently.

**Result for the four months (72 worked bills):**
- 38 match to the centavo.
- Every bill up to 400 kWh is within 2 centavos.
- The largest difference is ₱0.30, on a 5,000 kWh bill in August 2026.

**Why the remaining differences exist:** Meralco publishes its VAT rates rounded (for example "8.33%") but bills with
more precise ones.

**The tolerance:** 2 centavos plus 1 centavo per ₱1,000 of bill. A misread column or the wrong month misses by pesos,
so it fails this check.

## Updating (monthly, by hand)

Meralco's website uses bot protection, and its file names change from month to month, so a scheduled job cannot
reliably find the new documents. There is no automatic update; the page marks the data as behind once a newer month
has started.

When Meralco announces the new month's rates (usually in the second week):

1. Open [the rates page](https://www.meralco.com.ph/residential/rates-and-charges) and copy the links to the month's
   *Summary of Schedule of Rates* and *Typical Consumption Level* PDFs.
2. Run, with `pdftotext` from the xpdf tools installed:

   ```
   npm run data:electricity -- --month 2026-12 --schedule <schedule PDF link> --bills <bills PDF link>
   ```

   If the links do not download from the command line, save the two PDFs. Pass the files as `--schedule` and
   `--bills`, and the links as `--schedule-url` and `--bills-url`.
3. The script checks that both PDFs are for that billing month, rebuilds the month, and reproduces Meralco's worked
   bills before writing. It keeps the latest 13 months.
4. Run `npm test` and commit.

## Adding another utility

The format is per provider, so an electric cooperative or another distribution utility can be added. Add a provider
with its schedules in the same shape, plus a parser for its publication. A provider is added only when its own
published worked bills can be reproduced the same way. Until then, the page offers "Other provider" with a rate
per kWh typed by the visitor, and labels the result an estimate.

## Limits

- Residential customers only. Business and industrial classes, net metering and time-of-use rates are not modelled.
- Local franchise tax depends on the city or municipality. Meralco's sample bills assume 0.50%, and the visitor can
  change it. The bill check treats 0% to 0.75% as the normal range.
- The senior citizen discount (RA 9994) for qualified accounts up to 100 kWh is not applied.
- Appliance figures are estimates from watts, hours and a running share, not measurements.
