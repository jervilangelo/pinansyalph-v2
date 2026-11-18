/**
 * Sources for "Mga Dapat Iwasan". Each one was opened and read on the date in
 * `verified`, except where `status` says otherwise, and `supports` says which
 * claim on the page it backs. Academic references were checked against
 * Crossref (title, authors, journal, year, DOI).
 */

export interface IwasanSource {
  id: string
  org: string
  title: string
  /** Publication date as written on the document. */
  date: string
  url: string
  /** The part of the document cited. */
  section: string
  /** What the page uses it for. */
  supports: string
  verified: string
  /**
   * read: the document's text was read.
   * crossref: an academic paper whose title, authors, journal and DOI were checked against Crossref; cited for its main finding.
   * not-opened: the site refused automated reading; cited for its title and role only.
   */
  status: 'read' | 'crossref' | 'not-opened'
}

const V = '2026-11-18'

export const IWASAN_SOURCES: IwasanSource[] = [
  // Credit cards
  {
    id: 'bsp-1165',
    org: 'Bangko Sentral ng Pilipinas',
    title: 'Circular No. 1165, Series of 2023: Amendments to the Ceiling on Interest or Finance Charges for Credit Card Receivables',
    date: 'January 2023 (Monetary Board Resolution No. 55, 13 January 2023)',
    url: 'https://www.bsp.gov.ph/Regulations/Issuances/2023/1165.pdf',
    section: 'Section 1 (MORB §312) and Section 2 (MORNBFI §101-CC)',
    supports:
      'Credit card interest or finance charges may not exceed 36% a year; installment loans on cards, a monthly add-on rate of 1%; cash advances, no fee other than a processing fee of at most ₱200; ceilings reviewed every six months.',
    verified: V,
    status: 'read',
  },
  // Loans
  {
    id: 'bsp-1133',
    org: 'Bangko Sentral ng Pilipinas',
    title: 'Circular No. 1133, Series of 2021: Ceiling/s on Interest Rates and Other Fees Charged by Lending Companies (LCs), Financing Companies (FCs), and their Online Lending Platforms (OLPs)',
    date: '22 December 2021; effective 3 January 2022',
    url: 'https://www.bsp.gov.ph/Regulations/Issuances/2021/1133.pdf',
    section: 'Section 1, "Loans covered by the ceilings" and "Applicable ceiling/s"',
    supports:
      'For unsecured, general-purpose loans of up to ₱10,000 and up to four months: nominal interest of at most 6% a month; effective interest (including processing, service and other fees, excluding late penalties) of at most 15% a month; late penalties of at most 5% a month on the amount due; total cost of at most 100% of the amount borrowed.',
    verified: V,
    status: 'read',
  },
  {
    id: 'sec-mc18-2019',
    org: 'Securities and Exchange Commission',
    title: 'MC No. 18 s.2019: Prohibition on Unfair Debt Collection Practices of Financing Companies (FC), and Lending Companies (LC)',
    date: '2019',
    url: 'https://www.sec.gov.ph/mc-2019/mc-no-18-s-2019-prohibition-on-unfair-debt-collection-practices-of-financing-companiesfc-and-lending-companieslc/',
    section: 'Whole circular',
    supports: 'Unfair debt collection by lending and financing companies is prohibited. Referred to by NPC Circular No. 20-01 (read); the SEC website refused our automated request.',
    verified: V,
    status: 'not-opened',
  },
  {
    id: 'sec-olp-list',
    org: 'Securities and Exchange Commission',
    title: 'List of Recorded Online Lending Platforms',
    date: 'Updated by the SEC',
    url: 'https://www.sec.gov.ph/lending-companies-and-financing-companies-2/list-of-recorded-online-lending-platforms/',
    section: 'Whole list',
    supports: 'Where to check whether a lending app belongs to a company recorded with the SEC.',
    verified: V,
    status: 'not-opened',
  },
  // Privacy
  {
    id: 'npc-2022-02',
    org: 'National Privacy Commission',
    title: 'NPC Circular No. 2022-02: Amending Certain Provisions of NPC Circular No. 20-01 on the Guidelines on the Processing of Personal Data for Loan-Related Transactions',
    date: '1 December 2022',
    url: 'https://privacy.gov.ph/wp-content/uploads/2023/05/NPC-Circular-No.-2022-%E2%80%93-02-Amending-20-01-Loan-Related-Transactions.pdf',
    section: 'Section 2 (amended Section 3)',
    supports:
      '“Unbridled processing” of contact lists is prohibited, including processing that leads to harassment and processing for debt collection outside the guarantors the borrower provided; lenders may access contacts only so borrowers can pick their own character references and guarantors.',
    verified: V,
    status: 'read',
  },
  // Complaints
  {
    id: 'bsp-cam',
    org: 'Bangko Sentral ng Pilipinas',
    title: 'How to File a Complaint against a BSP-Supervised Institution',
    date: 'September 2025',
    url: 'https://www.bsp.gov.ph/Inclusive%20Finance/How-to-file-a-complaint-with-BSP-CAM-Sep2025.pdf',
    section: 'Steps for new complaints',
    supports:
      'Complain first to the institution’s own consumer assistance channel; if unresolved, escalate to the BSP Consumer Assistance Mechanism through the BSP Online Buddy (BOB) chatbot, or by emailing a CIR form to consumeraffairs@bsp.gov.ph. Under RA 11765 and BSP Circular No. 1169.',
    verified: V,
    status: 'read',
  },
  // Gambling
  {
    id: 'pagcor-exclusion',
    org: 'Philippine Amusement and Gaming Corporation',
    title: 'Player Exclusion',
    date: 'Current page',
    url: 'https://www.pagcor.ph/regulatory/exclusion.php',
    section: 'Self Exclusion/Banning; Family Exclusion/Banning',
    supports:
      'Self-exclusion of 6 months, 1 year or 5 years; family exclusion (by a spouse, child or parent) of 6 months, 1 year or 3 years; enforced across all sites licensed and operated by PAGCOR.',
    verified: V,
    status: 'read',
  },
  // Behavioural research
  {
    id: 'kahneman-tversky-1979',
    org: 'Econometrica 47(2), 263–291',
    title: 'Kahneman, D. & Tversky, A. Prospect Theory: An Analysis of Decision under Risk',
    date: '1979',
    url: 'https://doi.org/10.2307/1914185',
    section: 'Value function: losses loom larger than gains',
    supports: 'Loss aversion.',
    verified: V,
    status: 'crossref',
  },
  {
    id: 'clark-2009',
    org: 'Neuron 61(3), 481–490',
    title: 'Clark, L., Lawrence, A. J., Astley-Jones, F. & Gray, N. Gambling Near-Misses Enhance Motivation to Gamble and Recruit Win-Related Brain Circuitry',
    date: '2009',
    url: 'https://doi.org/10.1016/j.neuron.2008.12.031',
    section: 'Near-misses rated as less pleasant yet increased desire to play',
    supports: 'The near-miss effect.',
    verified: V,
    status: 'crossref',
  },
  {
    id: 'laibson-1997',
    org: 'The Quarterly Journal of Economics 112(2), 443–478',
    title: 'Laibson, D. Golden Eggs and Hyperbolic Discounting',
    date: '1997',
    url: 'https://doi.org/10.1162/003355397555253',
    section: 'Present-biased preferences and credit card borrowing',
    supports: 'Instant gratification.',
    verified: V,
    status: 'crossref',
  },
  {
    id: 'stewart-2009',
    org: 'Psychological Science 20(1), 39–41',
    title: 'Stewart, N. The Cost of Anchoring on Credit-Card Minimum Repayments',
    date: '2009',
    url: 'https://doi.org/10.1111/j.1467-9280.2008.02255.x',
    section: 'Minimum repayment information lowers chosen repayments',
    supports: 'Minimum payment anchoring.',
    verified: V,
    status: 'crossref',
  },
]

export const source = (id: string) => {
  const s = IWASAN_SOURCES.find((x) => x.id === id)
  if (!s) throw new Error(`Unknown source ${id}`)
  return s
}
