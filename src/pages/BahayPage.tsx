import { Page } from '../components/layout/Page'
import { BahaySection } from '../components/sections/BahaySection'
import { t } from '../i18n'

/** Its own chunk: the housing data loads only on this page. */
export const BahayPage = () => (
  <Page
    path="/magkano-bahay"
    title={t("Magkano Bahay Ngayon? Philippine house and condo prices")}
    description={t("Alamin ang presyuhan ng bahay at condo sa Pilipinas: official BSP median prices by area, price trends, an asking-price check and a home loan affordability calculator.")}
  >
    <BahaySection />
  </Page>
)
