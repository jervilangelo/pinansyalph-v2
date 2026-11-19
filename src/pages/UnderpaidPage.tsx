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
import { UnderpaidSection } from '../components/sections/UnderpaidSection'
import { t } from '../i18n'

/** Its own chunk: the PSA salary dataset loads only on this page. */
export const UnderpaidPage = () => (
  <Page
    path="/underpaid-ba-ko"
    title={t("Underpaid ba ko? Salary comparison")}
    description={t("Competitive ba ang sweldo mo? Compare your pay with official PSA Occupational Wages Survey data by job, region and industry, and check if a job offer is worth it.")}
  >
    <UnderpaidSection />
  </Page>
)
