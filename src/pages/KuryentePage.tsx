import { Page } from '../components/layout/Page'
import { KuryenteSection } from '../components/sections/KuryenteSection'

/** Its own chunk: the electricity rates load only on this page. */
export const KuryentePage = () => (
  <Page
    path="/magkano-kuryente"
    title="Magkano Kuryente Ko? Meralco bill checker"
    description="Tama ba ang singil sa Meralco bill mo? Check your bill against Meralco’s published rates for the month, see what each appliance costs, compare two bills and estimate your savings."
  >
    <KuryenteSection />
  </Page>
)
