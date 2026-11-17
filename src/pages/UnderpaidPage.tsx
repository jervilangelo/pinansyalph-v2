import { Page } from '../components/layout/Page'
import { UnderpaidSection } from '../components/sections/UnderpaidSection'

/** Its own chunk: the PSA salary dataset loads only on this page. */
export const UnderpaidPage = () => (
  <Page
    path="/underpaid-ba-ko"
    title="Underpaid ba ko? Salary comparison"
    description="Competitive ba ang sweldo mo? Compare your pay with official PSA Occupational Wages Survey data by job, region and industry, and check if a job offer is worth it."
  >
    <UnderpaidSection />
  </Page>
)
