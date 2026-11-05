import { Page } from '../components/layout/Page'
import { BanksSection } from '../components/sections/BanksSection'
import { CompareSection } from '../components/sections/CompareSection'
import { FuelSection } from '../components/sections/FuelSection'
import { InflationSection } from '../components/sections/InflationSection'
import { Mp2Section } from '../components/sections/Mp2Section'
import { RealValueSection } from '../components/sections/RealValueSection'
import { SalarySection } from '../components/sections/SalarySection'
import type { ScenarioState } from '../hooks/useScenario'

type P = { s: ScenarioState }

export const SweldoPage = ({ s }: P) => (
  <Page path="/sweldo" title="Sweldo and expenses calculator" description="See your take-home pay after SSS, PhilHealth, Pag-IBIG and BIR withholding, then what is left after your bills.">
    <SalarySection s={s} />
  </Page>
)

export const Mp2Page = ({ s }: P) => (
  <Page path="/mp2" title="Pag-IBIG MP2 calculator" description="Project Pag-IBIG MP2 dividends and see what your savings are worth after official Philippine inflation.">
    <Mp2Section s={s} />
    <RealValueSection s={s} />
  </Page>
)

export const BanksPage = ({ s }: P) => (
  <Page path="/banks" title="Digital bank savings calculator" description="Digital bank savings with verified base rates, 20% final withholding tax and inflation.">
    <BanksSection s={s} />
  </Page>
)

export const ComparePage = ({ s }: P) => (
  <Page path="/compare" title="MP2 vs digital banks" description="Compare Pag-IBIG MP2 and digital bank savings on the same plan, in pesos or in today’s pesos.">
    <CompareSection s={s} />
  </Page>
)

export const InflationPage = () => (
  <Page path="/inflation" title="Philippine inflation tracker" description="Latest headline, core, food and transport inflation from PSA, with history since 2019.">
    <InflationSection />
  </Page>
)

export const GasPage = () => (
  <Page path="/gas" title="Fuel price adjustments" description="Weekly DOE pump price adjustments for gasoline, diesel and kerosene in the Philippines.">
    <FuelSection />
  </Page>
)
