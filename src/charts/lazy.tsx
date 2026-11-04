import { lazy, Suspense, type ComponentType } from 'react'

/** Charts load after the first paint; the slot keeps its height so nothing jumps. */
function withSuspense<P extends object>(load: () => Promise<{ default: ComponentType<P> }>, minHeight: number) {
  const Comp = lazy(load)
  return function Lazy(props: P) {
    return (
      <Suspense
        fallback={
          <div className="ui flex items-center justify-center bg-surface text-ink-2" style={{ minHeight }}>
            Loading chart…
          </div>
        }
      >
        <Comp {...props} />
      </Suspense>
    )
  }
}

export const MoneyVsInflationChart = withSuspense(() => import('./MoneyVsInflationChart'), 340)
export const ComparisonChart = withSuspense(() => import('./ComparisonChart'), 360)
export const InflationHistoryChart = withSuspense(() => import('./InflationHistoryChart'), 360)
export const FuelChart = withSuspense(() => import('./FuelChart'), 560)
export const SalaryCharts = withSuspense(() => import('./SalaryCharts'), 620)
