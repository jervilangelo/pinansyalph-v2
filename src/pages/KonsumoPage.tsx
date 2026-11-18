import { Page } from '../components/layout/Page'
import { KonsumoSection } from '../components/sections/KonsumoSection'

/** Its own chunk: the appliance directory and rate schedule load only on this page. */
export const KonsumoPage = () => (
  <Page
    path="/magkano-konsumo"
    title="Magkano Konsumo Ko? Appliance electricity calculator"
    description="Alamin kung magkano ang kinakain ng kuryente ng mga appliances mo. Estimate each appliance's kWh and cost a day, a month and a year, and what using it less would save."
  >
    <KonsumoSection />
  </Page>
)
