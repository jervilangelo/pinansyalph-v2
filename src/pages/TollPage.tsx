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
import { TollSection } from '../components/sections/TollSection'
import { t } from '../i18n'

/** Its own chunk: the toll matrices load only on this page. */
export const TollPage = () => (
  <Page
    path="/magkano-ang-toll"
    title={t("Magkano ang Toll Ko? Expressway toll calculator")}
    description={t("Alamin ang toll fee bago bumiyahe. Toll fees for NLEX, SCTEX, TPLEX, Skyway, SLEX, STAR, CALAX and CAVITEX by vehicle class, with RFID load and round trip, from TRB-approved rates.")}
  >
    <TollSection />
  </Page>
)
