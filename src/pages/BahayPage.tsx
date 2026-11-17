import { Page } from '../components/layout/Page'
import { BahaySection } from '../components/sections/BahaySection'

/** Its own chunk: the housing data loads only on this page. */
export const BahayPage = () => (
  <Page
    path="/magkano-bahay"
    title="Magkano Bahay Ngayon? Philippine house and condo prices"
    description="Alamin ang presyuhan ng bahay at condo sa Pilipinas: official BSP median prices by area, price trends, an asking-price check and a home loan affordability calculator."
  >
    <BahaySection />
  </Page>
)
