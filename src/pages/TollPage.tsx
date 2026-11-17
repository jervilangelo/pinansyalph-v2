import { Page } from '../components/layout/Page'
import { TollSection } from '../components/sections/TollSection'

/** Its own chunk: the toll matrices load only on this page. */
export const TollPage = () => (
  <Page
    path="/magkano-ang-toll"
    title="Magkano ang Toll Ko? Expressway toll calculator"
    description="Alamin ang toll fee bago bumiyahe. Toll fees for NLEX, SCTEX, TPLEX, Skyway, SLEX, STAR, CALAX and CAVITEX by vehicle class, with RFID load and round trip, from TRB-approved rates."
  >
    <TollSection />
  </Page>
)
