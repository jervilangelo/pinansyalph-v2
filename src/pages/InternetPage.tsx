import { Page } from '../components/layout/Page'
import { InternetSection } from '../components/sections/InternetSection'

/** Its own chunk: the plan database loads only on this page. */
export const InternetPage = () => (
  <Page
    path="/sulit-internet"
    title="Sulit Ba Internet Ko? Internet plan comparator"
    description="Sulit ba talaga ang internet mo? Compare your plan's price per Mbps with verified plans from PLDT, Globe, Converge, Starlink, Smart and DITO, with installation and contract costs."
  >
    <InternetSection />
  </Page>
)
