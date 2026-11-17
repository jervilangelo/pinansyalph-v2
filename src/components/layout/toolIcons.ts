import { ArrowLeftRight, CarFront, Fuel, Gift, Landmark, PiggyBank, Scale, TrendingUp, Wallet, Zap, type LucideIcon } from 'lucide-react'
import type { Route } from '../../router'

/** One plain, recognisable icon per tool: what the tool is about, not decoration. */
export const TOOL_ICONS: Partial<Record<Route, LucideIcon>> = {
  '/sweldo': Wallet,
  '/underpaid-ba-ko': Scale,
  '/13th-month': Gift,
  '/mp2': PiggyBank,
  '/banks': Landmark,
  '/compare': ArrowLeftRight,
  '/inflation': TrendingUp,
  '/gas': Fuel,
  '/magkano-ang-toll': CarFront,
  '/magkano-kuryente': Zap,
}
