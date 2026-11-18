import { Page } from '../components/layout/Page'
import { SubscriptionSection } from '../components/sections/SubscriptionSection'

/** Its own chunk: the service directory and brand marks load only on this page. */
export const SubscriptionPage = () => (
  <Page
    path="/magkano-subscription"
    title="Magkano ba Subscription Ko? Subscription tracker"
    description="Akala mo maliit lang? Add your Netflix, Spotify, YouTube, iCloud, ChatGPT and other subscriptions, with official Philippine prices, and see what they cost you a month and a year."
  >
    <SubscriptionSection />
  </Page>
)
