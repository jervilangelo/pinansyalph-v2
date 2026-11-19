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
import { SubscriptionSection } from '../components/sections/SubscriptionSection'
import { t } from '../i18n'

/** Its own chunk: the service directory and brand marks load only on this page. */
export const SubscriptionPage = () => (
  <Page
    path="/magkano-subscription"
    title={t("Magkano ba Subscription Ko? Subscription tracker")}
    description={t("Akala mo maliit lang? Add your Netflix, Spotify, YouTube, iCloud, ChatGPT and other subscriptions, with official Philippine prices, and see what they cost you a month and a year.")}
  >
    <SubscriptionSection />
  </Page>
)
