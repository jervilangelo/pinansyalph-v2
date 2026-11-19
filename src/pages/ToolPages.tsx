/*
 * PinansyalPH (https://pinansyalph.site/)
 * Copyright (c) 2026 Jervil Angelo De Leon. All rights reserved.
 *
 * This source code is proprietary to its author. Copying,
 * reproducing, modifying, distributing, publishing or reusing it, in whole or
 * in part, without the author's prior written permission is not allowed.
 * See the LICENSE file at the root of this repository.
 */

import { Page } from '../components/layout/Page'
import { BanksSection } from '../components/sections/BanksSection'
import { CompareSection } from '../components/sections/CompareSection'
import { FuelSection } from '../components/sections/FuelSection'
import { InflationSection } from '../components/sections/InflationSection'
import { Mp2Section } from '../components/sections/Mp2Section'
import { RealValueSection } from '../components/sections/RealValueSection'
import { SalarySection } from '../components/sections/SalarySection'
import type { ScenarioState } from '../hooks/useScenario'
import { ThirteenthSection, useThirteenth } from '../components/sections/ThirteenthSection'
import { ThirteenthAllocation, ThirteenthLiteracy } from '../components/sections/ThirteenthGuide'
import { t } from '../i18n'

type P = { s: ScenarioState }

export const SweldoPage = ({ s }: P) => (
  <Page path="/sweldo" title={t("Sweldo and expenses calculator")} description={t("See your take-home pay after SSS, PhilHealth, Pag-IBIG and BIR withholding, then what is left after your bills.")}>
    <SalarySection s={s} />
  </Page>
)

export const ThirteenthPage = ({ s }: P) => {
  const h = useThirteenth()
  return (
    <Page path="/13th-month" title={t("13th month pay calculator")} description={t("Calculate your estimated 13th month pay under PD 851: prorated for new hires and resignations, with the ₱90,000 BIR tax exemption check.")}>
      <ThirteenthSection h={h} />
      <ThirteenthLiteracy />
      <ThirteenthAllocation amount={h.result.ok ? h.result.value.fullYear.toNumber() : 0} s={s} />
    </Page>
  )
}

export const Mp2Page = ({ s }: P) => (
  <Page path="/mp2" title={t("Pag-IBIG MP2 calculator")} description={t("Project Pag-IBIG MP2 dividends and see what your savings are worth after official Philippine inflation.")}>
    <Mp2Section s={s} />
    <RealValueSection s={s} />
  </Page>
)

export const BanksPage = ({ s }: P) => (
  <Page path="/banks" title={t("Digital bank savings calculator")} description={t("Digital bank savings with verified base rates, 20% final withholding tax and inflation.")}>
    <BanksSection s={s} />
  </Page>
)

export const ComparePage = ({ s }: P) => (
  <Page path="/compare" title={t("MP2 vs digital banks")} description={t("Compare Pag-IBIG MP2 and digital bank savings on the same plan, in pesos or in today’s pesos.")}>
    <CompareSection s={s} />
  </Page>
)

export const InflationPage = () => (
  <Page path="/inflation" title={t("Philippine inflation tracker")} description={t("Latest headline, core, food and transport inflation from PSA, with history since 2019.")}>
    <InflationSection />
  </Page>
)

export const GasPage = () => (
  <Page path="/gas" title={t("Fuel price adjustments")} description={t("Weekly DOE pump price adjustments for gasoline, diesel and kerosene in the Philippines.")}>
    <FuelSection />
  </Page>
)
