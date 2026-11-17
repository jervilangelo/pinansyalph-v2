# Housing prices: sources, research and updates

"Magkano Bahay Ngayon?" shows only published, official housing figures. This note covers
[`src/data/housing.json`](../src/data/housing.json): where the figures come from, which sources were reviewed and left
out, and how to update the data.

## Production source

**Bangko Sentral ng Pilipinas, [Residential Property Price Index Report, 2nd Quarter 2026](https://www.bsp.gov.ph/Media_And_Research/RPPI/RPPI-Report-2026-Q2.pdf)**
(published September 2026, covering April to June 2026). Copied exactly from the report:

| Figure in the report | Stored as | Unit |
| --- | --- | --- |
| Figure 4, median prices per type of housing unit by area | `medians` | Philippine pesos |
| Figures 3b–3c, number of residential real estate loans granted | `loans` | Loans |
| Figures 1a–2c, percent change of the RPPI | `growth` | Percent (year-on-year, quarter-on-quarter) |

The report covers seven areas: Philippines, NCR, Areas outside NCR, Balance GMA (Batangas, Bulacan, Cavite, Laguna,
Pampanga and Rizal), Metro Cebu, Metro Mindanao and Other Areas. It covers condominium units and houses (all house
types together).

Since 2025 the RPPI is built from the acquisition cost of homes financed by bank residential real estate loans,
covering new, pre-owned and foreclosed homes. The
[IMF technical assistance report (2024)](https://www.imf.org/en/Publications/technical-assistance-reports/Issues/2024/07/22/The-Philippines-Report-on-the-Residential-Property-Price-Index-Mission-January-22-26-2024-552176)
describes the move from appraised values to acquisition costs.

**What the medians are not:** asking prices, appraisals of a specific home, BIR zonal values, or prices per square
meter. They leave out homes bought in cash, through Pag-IBIG or through developer in-house financing.

### Checks on the transcription

The unit tests check that the figures copied from the report are internally consistent:

- **Loan counts:** NCR + outside NCR equals the Philippines total, and the four sub-areas outside NCR add up to their
  total, for both condominium units and houses.
- **Price changes:** the sub-areas' quarter-on-quarter changes, weighted by the report's 2026 area weights, agree with
  the published outside-NCR figure within 0.6 points in every quarter.

### Loan rate reference

Pag-IBIG's 3% rate for socialized housing under the 4PH program comes from the
[Philippine Information Agency, April 2026](https://pia.gov.ph/news/pag-ibig-keeps-3-housing-loan-rate-to-shield-workers-from-inflation/).
Pag-IBIG's website blocks automated access, and secondary sites disagree on its regular rate table, so no other rate
is pre-filled. Visitors enter the rate their lender quotes.

## Access to official sites

| Site | Result |
| --- | --- |
| bsp.gov.ph | Denies automated requests (Akamai), including `robots.txt`. The report PDF was read once as an ordinary page fetch, its text extracted with `pdftotext`, and its chart labels read from the figures embedded in the PDF. |
| pagibigfund.gov.ph | Blocks automated access. |
| lamudi.com.ph | Returns 403 to automated requests. |
| Kaggle dataset pages | Render without their licence text to automated reads. |

## The four GitHub repositories

| | [Ph-Real-Estate](https://github.com/aronnicksnts/Ph-Real-Estate) | [pasig-house-prices-prediction](https://github.com/ralphcajipe/pasig-house-prices-prediction) | [philippine-housing-prediction](https://github.com/adrianpintacasi/philippine-housing-prediction) | [Estate-Prices-NN](https://github.com/Acteus/Estate-Prices-NN) |
| --- | --- | --- | --- | --- |
| Data | 77,808 Lamudi listings (house, condo, apartment; sale and rent) | Kaggle “Philippine Real Estate” (`PH_houses_v2.csv`, 1,500 Lamudi listings), Pasig subset | Kaggle “Philippines Housing Market” (`PH_Housing.csv`, 1,500 Lamudi listings) | Same Kaggle set as Pasig |
| Collected | About 2022 (last commit January 2023) | Dataset last updated 2022 | March 2024 | 2022 dataset |
| Code licence | None | MIT | None | MIT (README) |
| Data reuse | Not granted; scraped with a rotating free-proxy list | Not stated by the repository; Kaggle licence not verifiable | Not stated; Kaggle licence not verifiable | As Pasig |
| Method | Scraping, cleaning, histograms | Gradient boosted trees (TF Decision Forests), Flask app | Linear, tree, random forest, XGBoost; 5-fold cross-validation; k-means regions; IQR outlier filter | Keras neural network |
| Reported accuracy | — | RMSE on the training set only | XGBoost R² 0.81, MAPE 24.7% | R² −1.19, MAPE 24.65% |
| Used here | No | No | Ideas only (see below) | No |

**Why no listing data or model is used:**

- **Licences:** none of the datasets has a reuse licence that could be verified. They are scraped from one portal that
  blocks automated access, and a public repository does not grant the right to republish third-party listings.
- **Freshness:** they are snapshots from 2022 to March 2024, not current prices.
- **Coverage:** about 1,500 listings nationwide in the Kaggle sets (53 in all of Mindanao in one of them) is too thin
  for city-level medians.
- **Accuracy:** the best model's typical error is about a quarter of the price (MAPE about 25%), too wide to call an
  estimate of a specific home. One model scores below a flat average.

**What was learned:**
- **Location and type:** prices depend mostly on location and housing type.
- **Separate measures:** floor area and lot area are different quantities and must not be multiplied by the same rate.
- **Outliers and validation:** an IQR filter and cross-validation are reasonable defaults if licensed listing data
  becomes available.

The architecture (sources registry, areas, per-type figures) is ready to take such data as a separate, clearly labelled
asking-price layer.

## Not included

- BIR zonal values: tax reference values, not market prices.
- Prices per square meter, vacant lots, and townhouse or duplex medians: not published by an official source.
- Property portal statistics: no licensed data feed was identified.
- Professional market reports (Colliers, Leechiu, JLL, CBRE, and others): published as PDFs under their own terms,
  mostly about the Metro Manila condominium market. Not integrated.

## Updating

BSP publishes the RPPI report each quarter, about three months after the quarter ends.

1. Open the new report. BSP's reports follow the pattern
   `https://www.bsp.gov.ph/Media_And_Research/RPPI/RPPI-Report-<year>-Q<quarter>.pdf`.
2. Copy Figure 4 (medians), Figures 3b–3c (loans) and the percent-change tables into `src/data/housing.json`, with the
   new `period`, `published` and `verifiedOn` dates.
3. Run `npm test`. The consistency checks above catch most transcription slips.
4. If BSP changes its areas or types, update `areas` and [`src/data/housingLocations.ts`](../src/data/housingLocations.ts).
