# Methodology

How **PinansyalPH** turns published data into projections. Every rule below is implemented in
[`src/calculators/`](../src/calculators) and covered by the unit tests in
[`src/calculators/__tests__/`](../src/calculators/__tests__).

All money is computed with [decimal.js](https://mikemcl.github.io/decimal.js/) (34 significant digits). Amounts are
rounded to centavos (half-up) only where an institution would round: when dividends or interest are credited and when
tax is withheld.

These are **projections**, not statements. No result here is claimed to match an official Pag-IBIG or bank computation
to the centavo.

---

## 1. Pag-IBIG MP2

### What Pag-IBIG publishes

- MP2 is a voluntary savings program with a **five-year term**, counted from the first remittance.
- A **dividend rate is declared once a year**, after the year closes, based on the Fund's net income. The rate for 2025
  (7.12%) was announced on 27 February 2026. Past rates are not a guarantee of future rates.
- At enrollment, members choose **annual payout** (dividends paid out every year) or **compounding** (dividends added to
  the savings and paid at maturity).
- MP2 dividends are **tax-exempt**.
- Minimum remittance is ₱500. Early withdrawal is only allowed for specific reasons and forfeits 50% of dividends.

`pagibigfund.gov.ph` sits behind a browser challenge, so the official page could not be fetched by script. Rates are
recorded from Pag-IBIG's declarations as reported by multiple national news outlets
(`status: "verified-secondary"` in [`src/data/mp2.json`](../src/data/mp2.json)).

### Model used

Pag-IBIG does not publish a step-by-step formula. Public explanations agree that the annual dividend is the declared
rate applied to the year's **average balance**, not to the year-end total. This site models that monthly:

```
for each month t of the term:
    deposit_t   = initial (t = 0) + contribution (by frequency)
    earning_t   = balance_before + deposit_t × w        # w = 1, 0.5 or 0 (timing setting)
    accrued    += earning_t × rate_y / 12               # rate_y = rate of the calendar year
    balance    += deposit_t
    if December or last month of the term:
        credited = round_centavos(accrued)
        compounded → balance += credited  (earns from next month)
        annual     → paid out; kept as cash, no further growth
```

- Summed over a calendar year, `Σ earning × rate / 12` equals `rate × average monthly balance`.
- **Timing (`w`)**: a payment made early in the month earns the whole month (`start`), mid-month earns half (`mid`,
  default), end of month earns from the next month (`end`). Real postings depend on when Pag-IBIG receives the payment.
- **Calendar years**: the first year is partial if you start mid-year; its dividend is credited in December.
- **Longer than five years**: the projection continues as if the matured savings were rolled into a new MP2 term on the
  same terms. This is labelled hypothetical in the interface.
- **Rate options**: the latest declared rate (projected forward), the simple average of the last five declared rates,
  or a custom rate. The interface labels which one is in use.

Why not `total contributions × rate`? That ignores that money deposited in December has earned for one month, not
twelve. The test `accounts for contribution timing within the month` shows the difference on a ₱500/month example.

### Known differences from actual statements

Posting dates, the exact day-count Pag-IBIG uses within a month, and rounding of intermediate amounts may differ. Expect
small differences, larger for short horizons.

---

## 2. Bank savings and time deposits

### Inputs from each bank

Stored in [`src/data/banks.json`](../src/data/banks.json): base rate tiers, any promotional rate with its balance cap,
conditions and end date, crediting frequency, day-count basis, term (time deposits), conditional bonus, liquidity, the
official source URL, and the exact text that proved the rate when it was verified.

### Rules

- **Deposits** are made at the start of each month and earn for that whole month.
- **Monthly interest** = `balance × annual rate × days ÷ basis`, where `days` is the actual length of the calendar month
  and `basis` is the bank's disclosed day count (360 for CIMB, per its product disclosure sheet) or 365 otherwise.
  This reproduces CIMB's published example exactly: ₱100,000 × 2.30% × 30 ÷ 360 = ₱191.67 gross, ₱38.33 tax.
- **Daily crediting** compounds daily on the after-tax rate, because banks withhold tax each time they credit.
- **Unknown crediting**: if the bank does not state it, monthly crediting is assumed and the result says so.
- **Tiers** are marginal: each slice of the balance earns its own tier's rate.
- **Promotions** apply only if the user switches them on, only to the promo's balance cap, and only until the promo's end
  date. After that, the base rate applies. An expired promo is ignored with a visible note.
- **Time deposits** take one placement. Each matured term is renewed at the same rate with the after-tax interest
  added; months left after the last full term earn nothing. Conditional bonuses (e.g. Tonik's +1%) are excluded unless
  the user switches them on.
- **Rate override**: users can replace the published rate with their own.

### Tax

Interest on peso bank deposits is subject to a **20% final withholding tax**. Republic Act 12214 (Capital Markets
Efficiency Promotion Act, effective 1 July 2025) applies this uniformly and removed the exemption for deposits of five
years or more for deposits made from that date. The tax is deducted from every credit and rounded to centavos.
Source used: [Land Bank notice on CMEPA](https://www.landbank.com/advisory/notice-to-depositors-on-cmepa); also stated
in CIMB's and OwnBank's own disclosures.

**MP2 is not taxed**: its dividends are tax-exempt, so the 20% rule is never applied to MP2.

---

## 3. Inflation and real value

### Price index

A monthly price index is built from annual inflation assumptions:

```
P[0] = 1
P[t] = P[t−1] × (1 + π_y)^(1/12)        π_y = inflation assumed for the simulation year containing month t
```

With one constant rate this equals `(1 + π)^(t/12)`, so after whole years

```
Real value = Nominal value ÷ (1 + π)^years
```

With a different rate each year it is the product of the yearly factors (cumulative inflation), not an average.

### The three numbers shown in "Lumago nga ba talaga?"

| Number | Formula | Meaning |
| --- | --- | --- |
| Nominal peso earnings | `ending − Σ contributions` | What a statement would show you earned. |
| What the final amount buys today | `ending ÷ P[T]` | Purchasing power of the ending amount, in today's pesos. |
| Inflation-adjusted gain | `ending ÷ P[T] − Σ (contribution_t ÷ P[t])` | Buying power gained, with each contribution valued at the month it was made. |

`ending` is the final balance plus any MP2 dividends already paid out (held as cash). Valuing each contribution at its
own month avoids a common error: comparing the deflated ending amount against undeflated deposits, which would treat a
deposit made in year five as if it had lost five years of value.

The **real annual return** is the money-weighted return (internal rate of return) of the real cash flows, found by
bisection and annualised.

### Insight messages

The message is chosen from the numbers only:

- real gain above +0.5% of real contributions → "outpaced inflation"
- below −0.5% → "lost buying power" (with a different message when the peso balance also fell)
- otherwise → "roughly kept pace"

The site's title asks a question. It never forces a negative answer.

### Inflation assumptions offered

- **PSA five-year average**: mean of PSA's published annual headline inflation for the last five complete years.
- **Latest PSA reading**: the newest month's year-on-year headline rate, applied to every future year.
- **BSP target midpoint (3%)**: the middle of the Bangko Sentral's 2–4% target range.
- **Custom**.

Future inflation is unknown; every option is an assumption and is labelled as one.

---

## 4. Fuel prices

DOE's weekly Oil Monitor reports the **pump price adjustment** (₱ per liter) per fuel, usually as a range across oil
companies, and the **year-to-date net change**. The site shows exactly those.

- An adjustment is a change in pesos per liter. It is **not** a price level and **not** an inflation rate.
- A percentage change needs a price level. DOE publishes pump prices per area, not one national price, so the site does
  not invent a nationwide price and shows no fuel percentage.
- PSA's **transport CPI** (fuel, fares and vehicles together) is shown separately as the inflation measure.
- Weekly bars use the midpoint of DOE's range; the tooltip shows the full range.

---

## 5. Rounding and precision

- Dividends, interest and tax: rounded to centavos at each credit (half-up).
- Displayed headline figures: rounded to whole pesos; tables show centavos.
- Inputs up to ₱1 trillion are accepted; tests confirm results stay exact at that size.

---

## 6. Salary and take-home pay ("Saan napupunta ang sweldo ko?")

Rules live in [`src/data/payroll.json`](../src/data/payroll.json), validated by
[`src/types/payroll.ts`](../src/types/payroll.ts). Each component keeps a list of versions with an `effectiveFrom`
date, the issuance, its source URL and a verification status. The calculator in
[`src/calculators/payroll.ts`](../src/calculators/payroll.ts) picks the version in force on the payroll date, so a new
rate is added as a new version without touching code.

| Deduction | Rule used (version in force since) | Source | Status |
| --- | --- | --- | --- |
| SSS | Employee 5% of the Monthly Salary Credit; MSC ₱5,000 to ₱35,000 in ₱500 steps; MSC above ₱20,000 goes to the Mandatory Provident Fund (2025-01-01) | SSS Circular No. 2024-006 (official table read directly) | verified-manual |
| PhilHealth | Employee pays half of 5% of basic monthly salary, floored at ₱10,000 and capped at ₱100,000 (2024-01-01) | PhilHealth Circular 2020-0005 / RA 11223 (scanned circular; cross-checked) | verified-secondary |
| Pag-IBIG | Employee 1% up to ₱1,500 and 2% above, on at most ₱10,000 (₱200 maximum) (2024-02-01) | HDMF Circular No. 460 (site blocks automated access; cross-checked) | verified-secondary |
| Withholding tax | BIR Annex E tables for 2023 onwards; annual graduated rates 0% to ₱250,000 then 15/20/25/30/35% (2023-01-01) | RR No. 11-2018 (official PDF text) | verified-manual |

The withholding tables are checked in the unit tests against the annual graduated rates: every table's bracket bases
must follow from its rates, and monthly withholding × 12 must match the annual tax.

### Computation

```
taxable compensation = basic + taxable allowances + other taxable income + overtime
SSS (employee)       = 5% × MSC(taxable compensation)
PhilHealth (employee)= 2.5% × clamp(basic, ₱10,000, ₱100,000)
Pag-IBIG (employee)  = 1% or 2% × min(basic, ₱10,000)
taxable income       = taxable compensation − SSS − PhilHealth − Pag-IBIG
withholding per pay  = BIR table for the pay frequency on (taxable income ÷ paydays per month)
take-home (monthly)  = gross (incl. non-taxable allowances) − contributions − withholding − other payroll deductions
```

- **Pay frequency**: monthly, semi-monthly and weekly use their own BIR tables. Biweekly is not in Annex E; the weekly
  table is applied to each week (half the biweekly pay). Contributions are monthly and are split evenly across paydays
  in the per-payday view; some employers deduct them on one payday instead.
- **Non-taxable allowances** are assumed to be de minimis benefits within BIR limits. Amounts above the limits are
  taxable and should be entered as taxable allowances.
- **Minimum wage earners** are exempt from income tax on the statutory minimum wage and on overtime, holiday, night
  differential and hazard pay. Other taxable income is still taxed. Contributions still apply.
- **13th month pay and bonuses** are entered per year and shown separately: up to ₱90,000 is exempt; the tax on the
  excess is the difference in annual graduated tax with and without it.
- **Other payroll deductions** (salary loans, co-op dues) are taken after tax.
- **No pay, no contributions**: a zero salary produces zero deductions.

These are estimates. Actual payroll depends on how your employer classifies compensation, timing of adjustments, and
annualisation at year end.

## 7. Monthly budget

[`src/calculators/budget.ts`](../src/calculators/budget.ts):

- Expenses are grouped (housing and utilities, transportation, food, personal, debt and commitments, other). Debt
  payments are tracked as debt; **savings and investments are kept separate** and never counted as spending.
- `remaining = take-home − expenses − savings`.
- Status: **positive** when more than 5% of take-home pay is left, **tight** from 0% to 5%, **negative** below zero.
- Groups can be switched off; switched-off groups are ignored entirely.
- **Fuel estimate**: `km per day × travel days per week × 52 ÷ 12 ÷ km per liter × price per liter`. DOE does not
  publish one national pump price, so the visitor enters the price they pay; DOE's latest weekly adjustment is shown as
  context.
- **Salary breakdown chart**: government deductions + other payroll deductions + each spending group + savings +
  remaining equals gross pay exactly; the code throws if it does not. When spending exceeds take-home pay, the shortfall
  is shown separately instead of a negative slice.

### Privacy

All salary and expense figures stay in the browser. Nothing is sent to analytics or third parties (a browser test
checks that no outside request is made while editing). Entries are saved to `localStorage` only if the visitor turns on
"Remember on this device"; turning it off or pressing "Clear saved data" deletes them.

## 8. 13th month pay ("Magkano Ang 13th Month Pay Mo?")

[`src/calculators/thirteenth.ts`](../src/calculators/thirteenth.ts), tested in
[`thirteenth.test.ts`](../src/calculators/__tests__/thirteenth.test.ts).

### Legal basis

| Rule | Source |
| --- | --- |
| Entitlement and formula | Presidential Decree No. 851 and its Revised Guidelines; restated in DOLE Labor Advisory No. 16, Series of 2025 |
| Coverage | Rank-and-file employees in the private sector who worked at least one month in the calendar year, regardless of status (regular, probationary, contractual, casual) or how they are paid; kasambahay under RA 10361 |
| Not covered here | Government employees (separate year-end bonus rules), managerial employees (not covered by PD 851; check the contract or company policy), and workers paid purely on commission, boundary or task basis |
| Deadline | On or before December 24; separated employees receive the prorated amount with their final pay |
| Maternity | The employer-paid salary differential under RA 11210 counts as basic salary; the SSS maternity benefit does not |
| Tax | NIRC Sec. 32(B)(7)(e) as amended by RA 10963 (TRAIN): 13th month pay and other benefits are exempt up to **₱90,000 combined** per year. The excess is ordinary taxable compensation at the graduated rates. Verified for 2026: House bills to raise the ceiling to ₱120,000 or ₱150,000 had not been enacted. |

### Formula

```
13th month pay = Σ (eligible basic salary earned in each month of the calendar year) ÷ 12
```

For each month, `eligible = basic salary for the days employed − unpaid absences + eligible adjustments + maternity
salary differential`.

- **Basic salary** follows the salary in force that month (an initial salary plus dated increases or decreases). It
  excludes overtime, premium and holiday pay, night differential, COLA and other allowances, profit sharing and the cash
  conversion of unused leave, unless a contract, CBA or company practice integrates them into basic pay.
- **Paid leave** is not deducted: the employee was paid. **Unpaid absences** (leave without pay, tardiness, undertime)
  are entered as the amount deducted from pay.
- **Hire and separation months.** When employment covers only part of a month and no payroll figure is entered, the
  month is estimated by calendar days (`monthly salary × days employed ÷ days in the month`, leap years included) and
  marked *partial est.* Payroll practice differs (working days, daily rate factors), so the visitor can replace any
  month with the **actual eligible basic salary** from their payslip, which is then used as is.
- **Earned vs projected.** A month counts as earned once it has ended on or before today (or employment ended within
  it). Later months are labelled *projected* and assume the salary continues; they are never shown as earned.
  *Earned-to-date 13th month pay* uses earned months only; the headline and *projected full-year* figure use all months.
- **Remaining entitlement** = full-year amount − 13th month pay already received (never below zero; an overpayment is
  flagged).
- **Coverage check.** If the employee worked less than one month in the year (no full calendar month and under 30
  days), the result carries a warning that PD 851 may not apply.
- **Rounding.** Amounts are summed with full decimal precision and rounded to centavos (half-up) only after dividing
  by 12.

### Tax check

`combined = 13th month pay + other qualifying benefits` (Christmas or productivity bonuses, de minimis above limits).
`exempt = min(combined, ceiling)`; `potentially taxable = combined − exempt`. The ceiling is read from the tax rule in
force on December 31 of the calculation year in [`payroll.json`](../src/data/payroll.json), so a future change is a
data edit.

No flat tax is applied to the excess. Only when the visitor enters their other annual taxable compensation does the
site estimate the additional tax, as `tax(compensation + excess) − tax(compensation)` using the BIR annual graduated
table already used by the salary calculator. Minimum wage earners are exempt on their statutory pay, so only the excess
is taxed for them. The site does not compute a net payout: final tax depends on year-end adjustment.

### Allocation ("Anong Gagawin Mo Sa 13th Month Pay Mo?")

An optional split of the projected amount into six buckets. The MP2 and digital bank projections call the existing
`calculateMp2` and `calculateSavings` engines (one-time deposit, five years, latest declared MP2 rate, the selected bank
product, five-year average inflation); no separate financial maths is written for this section.

## 9. Salary comparison ("Underpaid ba ko?")

An educational comparison of a visitor's pay with published Philippine wage statistics. It is not a legal
determination: earning below an average does not mean an employer is breaking the law, and the legal minimum wage
is set separately by region through the wage orders of the National Wages and Productivity Commission.

### Source

The **Occupational Wages Survey (OWS)** of the Philippine Statistics Authority, read from PSA OpenSTAT
(`Labor and Employment › Occupational Wages Survey`) through its PxWeb API. Eight tables are used:

| Survey round | Coverage | Tables used |
| --- | --- | --- |
| 2024 OWS, reference period August 2024 | Establishments with 10 or more workers, all major industries | Average basic pay, allowance and wage rate of all time-rated workers by region and by major industry group; average wage rate of the benchmark occupations *General office clerks* and *Elementary occupations*, by region and by major industry group |
| 2022 OWS | Establishments with 20 or more workers, selected industries | Average wage rate of *Accounting and bookkeeping clerks* by industry; median basic pay and median allowances of all time-rated workers by industry |

PSA notes a break in the series between 2022 and 2024 (coverage changed), so the two rounds are never combined or
compared with each other, and 2022 figures are always labelled with their year and coverage. Only the latest round of
the 2014–2022 series is kept.

PSA's fuller OWS report tables, with more industry-specific occupations, are published on psa.gov.ph, which refuses
automated access. They are not used. To add them, download the official tables by hand, add the figures to
`src/data/salary-benchmarks.json` with `status: "verified-manual"` and a `tables` entry naming the file and its
publication date, and run `npm run validate:data` and `npm test`.

### PSA definitions (from the table notes)

- **Time-rated workers on full-time basis**: paid by a unit of time, working at least the establishment's normal hours.
- **Basic pay**: pay for normal working time before SSS, PhilHealth and Pag-IBIG contributions and withholding tax;
  excludes overtime, night shift differential and other premium pay, commissions, tips, service charges and payment
  in kind.
- **Allowances**: regular, guaranteed cash payments such as living allowance; excludes reimbursements, uniforms,
  bonuses, gratuities and family allowances.
- **Wage rate**: basic pay + allowances.
- **Median**: half of workers receive more, half less.

### Comparing like with like

The visitor enters **basic monthly pay** and **regular monthly allowances** separately, both gross. Their wage rate is
basic pay + allowances, compared with PSA's wage rate. The 2022 medians are of basic pay, so they are compared with
basic pay only. Take-home pay is never compared: it is after contributions and tax, which PSA's figures are not.

```
difference = your pay − PSA figure
percent    = (your pay − PSA figure) ÷ PSA figure × 100
```

Example: a ₱30,000 average and ₱25,000 pay is ₱5,000, or 16.67%, below. Within ±5% (on the unrounded percentage)
the result reads "malapit sa benchmark", because survey averages are not precise to the peso.

### Choosing the benchmark

Most specific first, using only figures PSA published:

1. The occupation in the chosen region (2024).
2. The occupation in the chosen major industry group (2024, or 2022 for accounting and bookkeeping clerks).
3. The occupation nationwide.
4. All time-rated workers in the region, then in the industry, then nationwide (2024).
5. The 2022 median basic pay of the industry, as extra context.

PSA does not publish an occupation broken down by region **and** industry together, so no such figure is shown.

### Job titles

`src/data/salaryOccupations.ts` maps everyday job titles to PSA benchmark occupations under the Philippine Standard
Occupational Classification. A title is mapped only if it falls inside the PSA group: an Accountant (PSOC 2411) is
not an Accounting clerk (PSOC 4311). Common titles with no PSA benchmark (IT support, HR, customer service, nursing,
teaching and others) are listed with no benchmark, so the visitor is told plainly that only an all-workers comparison
is available.

### What is not available, and not estimated

- **Experience levels**: the OWS does not separate pay by experience. The experience question only changes the
  explanation.
- **Percentiles and sample sizes**: not published in these tables. No percentile is derived from an average.
- **Current market salaries**: the figures describe August 2024 (or 2022). The page shows how much consumer prices
  rose since the reference month, from PSA's purchasing power of the peso, without adjusting the benchmark.
- Government agencies, public schools and public hospitals are outside the survey.

Figures are stored as OpenSTAT publishes them, in whole pesos, so basic pay + allowance can differ from the wage
rate by ₱1.

### Updates

`npm run data:salary` (`scripts/update-salary-data.ts`) discovers the tables by title, maps every region and industry
explicitly (an unknown label stops the update), validates against `src/types/salary.ts`, refuses a result with far
fewer figures than the stored one, and writes only when the data changed. The
[`Update salary data`](../.github/workflows/update-salary-data.yml) workflow runs it weekly and commits changes;
the deploy workflow then rebuilds the site.

### Job offer comparison ("Sulit ba ang job offer?")

For the current job and the offer: take-home pay from the Sweldo calculator's payroll engine (rank-and-file,
semi-monthly), minus work costs = what is left.

```
commute per month = cost per office day × office days a week × 52 ÷ 12
what is left      = take-home pay − commute per month − other monthly work costs
yearly difference = 12 × (difference in what is left) + difference in 13th month pay
```

13th month pay is one month of basic pay for a full year (PD 851), treated as tax-free within the ₱90,000 ceiling.
Taxable allowances are taxed with basic pay; non-taxable (de minimis) allowances are not. Overtime, bonuses beyond
the 13th month, commissions, HMO and non-money factors are not counted, and the tool does not recommend a choice.

### Privacy

Everything is computed in the browser. Job title, location and pay are not stored or sent anywhere. Anonymous
community submissions are not collected; see [COMMUNITY-SALARY-DATA.md](COMMUNITY-SALARY-DATA.md) for the design
they would need first.

## 10. Expressway tolls ("Magkano ang Toll Ko?")

```
leg fare      = TRB matrix[vehicle class][entry plaza][exit plaza]    (one expressway)
trip toll     = sum of leg fares, one leg per expressway on the route
round trip    = trip toll (there) + trip toll (back, computed on its own)
RFID load     = sum of leg fares per account (Easytrip, Autosweep)
fuel          = distance ÷ km per liter × price per liter              (visitor's figures)
travel cost   = trip toll + fuel
```

- Fares are TRB-approved, VAT inclusive, in whole pesos.
- NLEX–SCTEX and Skyway–SLEX are each one integrated matrix, so a trip within them is a single leg.
- Expressways are joined at fixed junctions, and the route with the fewest expressways is used (breadth-first search).
- A plaza pair with no published fare is reported as not possible, never estimated.

Sources, the independent checks, discrepancies, what is not included and how to update are in
[TOLL-DATA.md](TOLL-DATA.md).

## 11. Electricity bills ("Magkano Kuryente Ko?")

```
each per-kWh line   = rate × kWh, rounded to centavos
distribution        = whole month's kWh × rate of its tier (0–200, 201–300, 301–400, over 400 kWh)
fixed lines         = supply and metering charges per customer per month
local franchise tax = LFT rate × (generation through real property tax adjustment)
VAT                 = published effective rate × generation, transmission, ancillary, system loss,
                      and 12% × (distribution, supply, metering, refunds, regulatory adjustments)
energy tax          = ₱0.10 / ₱0.20 / ₱0.35 per kWh by block above 650 kWh
lifeline discount   = 100% / 35% / 20% of the bill up to 50 / 70 / 100 kWh, registered households only
bill check          = your current charges − expected bill; "matches" within ₱5 or the 0%–0.75% LFT range
bill change         = (kWh after − kWh before) × rate before  +  (rate after − rate before) × kWh after
appliance kWh       = watts × quantity × hours a day × days × running share ÷ 1,000
saving              = bill at today's kWh − bill at the kWh after the change (same month's tariff)
```

The rates and the check against Meralco's worked bills are described in [ELECTRICITY-DATA.md](ELECTRICITY-DATA.md).

## 12. Housing prices ("Magkano Bahay Ngayon?")

```
median price       = BSP's published median for the area and type of home (no adjustment)
place → area       = the BSP RPPI area that covers the city, municipality or province
price change       = BSP's published percent change of the RPPI (year-on-year, quarter-on-quarter)
asking vs median   = (asking price − median) ÷ median × 100
monthly payment    = P × r ÷ (1 − (1 + r)^−n), r = annual rate ÷ 12, n = years × 12 (P ÷ n at 0%)
total interest     = monthly payment × n − P
share of income    = monthly payment ÷ gross monthly income
```

No price is estimated from floor or lot area. Sources, exclusions and the review of four public GitHub projects are in
[HOUSING-DATA.md](HOUSING-DATA.md).
