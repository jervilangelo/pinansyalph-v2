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
import { KuryenteSection } from '../components/sections/KuryenteSection'
import { t } from '../i18n'

/** Its own chunk: the electricity rates load only on this page. */
export const KuryentePage = () => (
  <Page
    path="/magkano-kuryente"
    title={t("Magkano Kuryente Ko? Meralco bill checker")}
    description={t("Tama ba ang singil sa Meralco bill mo? Check your bill against Meralco’s published rates for the month, see what each appliance costs, compare two bills and estimate your savings.")}
  >
    <KuryenteSection />
  </Page>
)
