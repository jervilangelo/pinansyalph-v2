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
import { KonsumoSection } from '../components/sections/KonsumoSection'
import { t } from '../i18n'

/** Its own chunk: the appliance directory and rate schedule load only on this page. */
export const KonsumoPage = () => (
  <Page
    path="/magkano-konsumo"
    title={t("Magkano Konsumo Ko? Appliance electricity calculator")}
    description={t("Alamin kung magkano ang kinakain ng kuryente ng mga appliances mo. Estimate each appliance's kWh and cost a day, a month and a year, and what using it less would save.")}
  >
    <KonsumoSection />
  </Page>
)
