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
