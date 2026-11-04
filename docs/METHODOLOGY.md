# Methodology

How **Worth It Ba Sa Pilipinas?** turns published data into projections. Every rule below is implemented in
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
