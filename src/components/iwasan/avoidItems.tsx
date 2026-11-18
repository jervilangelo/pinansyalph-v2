import { CreditCard, Dices, HandCoins, Layers, Repeat, ShoppingBag, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cardRepayment, debtCycle, expectedLoss, futureValue, installmentLoad, loanCost } from '../../calculators/iwasan'
import { peso } from '../../utils/format'
import { Cite } from './shared'

// Worked examples, computed with the same formulas as the calculators below.
const bet = expectedLoss({ perSession: 1000, sessionsPerWeek: 3, houseEdge: 2.7, weeks: 52 })
const loan = loanCost({ principal: 10000, deductedFees: 1500, monthlyRate: 6, method: 'add-on', months: 1, installments: 1, otherCharges: 0, lateFees: 0 })
const cycle = debtCycle({ principal: 5000, feePercent: 10, monthlyRate: 5, months: 1, cycles: 3, ownPayment: 0 })
const card = { balance: 30000, monthlyRate: 3, minPercent: 3, minAmount: 500, newSpending: 0 }
const cardFixed = cardRepayment(card, { kind: 'fixed', amount: 2000 })
const inst = installmentLoad(
  [
    { id: 'a', name: '', monthly: 1500, monthsLeft: 10 },
    { id: 'b', name: '', monthly: 1200, monthsLeft: 6 },
    { id: 'c', name: '', monthly: 900, monthsLeft: 3 },
  ],
  25000,
)
const extras = futureValue(100, 'daily', 1, 0)
const years = (m: number) => (m < 12 ? `${m} months` : `${Math.floor(m / 12)} year${m >= 24 ? 's' : ''}${m % 12 ? ` and ${m % 12} months` : ''}`)

export interface AvoidItem {
  id: string
  icon: LucideIcon
  title: string
  why: ReactNode
  example: ReactNode
  instead: ReactNode
}

export const AVOID: AvoidItem[] = [
  {
    id: 'betting',
    icon: Dices,
    title: 'Betting and gambling sites',
    why: 'Every game keeps a share of what you bet. Wins happen, but the longer you play, the more you lose.',
    example: (
      <>
        Betting ₱1,000 three times a week at a 2.7% house edge loses about <strong>{peso(bet.expectedLoss)}</strong> a year, on average.
      </>
    ),
    instead: (
      <>
        Don’t start, or only spend money you’re fine losing, with a limit set beforehand. If it’s hard to stop, PAGCOR offers self-exclusion.
        <Cite id="pagcor-exclusion" />
      </>
    ),
  },
  {
    id: 'loan-apps',
    icon: HandCoins,
    title: 'Online loan apps',
    why: 'Fees are taken out before you get the money, due dates are short, and some apps harass borrowers.',
    example: (
      <>
        Borrow ₱10,000, receive <strong>{peso(loan.cashReceived)}</strong>, repay <strong>{peso(loan.totalRepayment)}</strong> a month later: a {loan.effectiveMonthly?.toFixed(1)}% cost in one month.
      </>
    ),
    instead: (
      <>
        Keep an emergency fund. If you must borrow, use a bank, a cooperative or a government salary loan, and check the lender is SEC-registered.
        <Cite id="sec-olp-list" />
      </>
    ),
  },
  {
    id: 'reborrowing',
    icon: Repeat,
    title: 'Borrowing to pay another loan',
    why: 'Each new loan pays off the old one plus its fees and interest, so what you owe keeps growing.',
    example: (
      <>
        {peso(cycle.firstCash)} in hand becomes <strong>{peso(cycle.finalDue)}</strong> owed after borrowing again three times.
      </>
    ),
    instead: 'Ask the lender for a payment plan, and cut spending until the loan is paid off.',
  },
  {
    id: 'minimum',
    icon: CreditCard,
    title: 'Paying only the credit card minimum',
    why: 'The unpaid balance keeps getting charged interest, month after month.',
    example: (
      <>
        A ₱30,000 balance at 3% a month: paying ₱2,000 a month clears it in {years(cardFixed.months!)}. Paying only the minimum takes <strong>more than 50 years</strong>.
      </>
    ),
    instead: 'Pay the full statement balance. If you can’t, pay a fixed amount well above the minimum and stop using the card.',
  },
  {
    id: 'installments',
    icon: Layers,
    title: 'Stacking installments',
    why: 'Each plan looks small. Together they take a big part of every payday, for months.',
    example: (
      <>
        Three small plans (₱1,500 + ₱1,200 + ₱900) take <strong>{peso(inst.totalMonthly)}</strong> of a ₱25,000 salary, every month.
      </>
    ),
    instead: 'Add up all your installments before taking a new one, and compare the total with the cash price.',
  },
  {
    id: 'impulse',
    icon: ShoppingBag,
    title: 'Impulse buys and lifestyle creep',
    why: 'Small extras feel harmless, and spending rises every time pay does.',
    example: (
      <>
        ₱100 a day on small extras is <strong>{peso(extras.futureValue)}</strong> a year.
      </>
    ),
    instead: 'Wait a week before unplanned purchases. When pay rises, raise your savings first.',
  },
]
