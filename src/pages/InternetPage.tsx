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
import { InternetSection } from '../components/sections/InternetSection'
import { t } from '../i18n'

/** Its own chunk: the plan database loads only on this page. */
export const InternetPage = () => (
  <Page
    path="/sulit-internet"
    title={t("Sulit Ba Internet Ko? Internet plan comparator")}
    description={t("Sulit ba talaga ang internet mo? Compare your plan's price per Mbps with verified plans from PLDT, Globe, Converge, Starlink, Smart and DITO, with installation and contract costs.")}
  >
    <InternetSection />
  </Page>
)
