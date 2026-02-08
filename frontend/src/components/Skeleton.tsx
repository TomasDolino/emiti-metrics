/**
 * Skeleton loading components with shimmer effect
 * Use these while data is loading for a polished UX
 */

import { cn } from '../lib/utils'

interface SkeletonProps {
  className?: string
  style?: React.CSSProperties
}

// Base skeleton with shimmer
export function Skeleton({ className, style }: SkeletonProps) {
  return <div className={cn('skeleton', className)} style={style} />
}

// Metric card skeleton
export function MetricCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <Skeleton className="h-4 w-20 mb-2" />
          <Skeleton className="h-8 w-28 mb-3" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
        <Skeleton className="w-10 h-10 rounded-lg" />
      </div>
    </div>
  )
}

// Ad row skeleton (1 line card)
export function AdRowSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border-l-4 border-l-gray-200 dark:border-l-gray-700">
      <div className="flex-1 min-w-0">
        <Skeleton className="h-4 w-40 mb-1" />
        <Skeleton className="h-3 w-24" />
      </div>
      <div className="text-right hidden sm:block">
        <Skeleton className="h-4 w-16 mb-1" />
        <Skeleton className="h-3 w-8" />
      </div>
      <div className="text-right hidden sm:block">
        <Skeleton className="h-4 w-12 mb-1" />
        <Skeleton className="h-3 w-8" />
      </div>
      <div className="text-right">
        <Skeleton className="h-4 w-10 mb-1" />
        <Skeleton className="h-3 w-14" />
      </div>
      <Skeleton className="h-5 w-16 rounded" />
    </div>
  )
}

// Chart skeleton
export function ChartSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
      <Skeleton className="h-5 w-24 mb-4" />
      <div className="h-64 flex items-end gap-2 px-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="flex-1 flex flex-col justify-end">
            <Skeleton
              className="w-full rounded-t"
              style={{ height: `${Math.random() * 60 + 40}%` }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <Skeleton className="w-3 h-3 rounded-full" />
          <Skeleton className="h-3 w-16" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="w-3 h-3 rounded-full" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    </div>
  )
}

// Pie chart skeleton
export function PieChartSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
      <Skeleton className="h-5 w-40 mb-4" />
      <div className="flex items-center">
        <div className="w-1/2 h-48 flex items-center justify-center">
          <div className="relative">
            <Skeleton className="w-36 h-36 rounded-full" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 bg-white dark:bg-gray-800 rounded-full" />
            </div>
          </div>
        </div>
        <div className="w-1/2 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="w-3 h-3 rounded-full" />
              <Skeleton className="h-4 w-16 flex-1" />
              <Skeleton className="h-4 w-8" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Alert banner skeleton
export function AlertBannerSkeleton() {
  return (
    <div className="rounded-xl p-4 flex items-center gap-3 bg-gray-100 dark:bg-gray-800 border-l-4 border-l-gray-300">
      <Skeleton className="w-5 h-5 rounded-full" />
      <div className="flex-1">
        <Skeleton className="h-4 w-32 mb-1" />
        <Skeleton className="h-4 w-48" />
      </div>
      <Skeleton className="h-4 w-12" />
    </div>
  )
}

// Quick stats banner skeleton
export function QuickStatsSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border-l-4 border-l-gray-300">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div>
            <Skeleton className="h-3 w-10 mb-1" />
            <Skeleton className="h-6 w-32" />
          </div>
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-40 rounded-lg" />
          <Skeleton className="h-8 w-40 rounded-lg" />
        </div>
        <Skeleton className="h-5 w-20" />
      </div>
    </div>
  )
}

// Table row skeleton
export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <div className="flex items-center gap-4 p-3 border-b border-gray-100 dark:border-gray-700">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className={cn(
          'h-4',
          i === 0 ? 'flex-1' : 'w-20'
        )} />
      ))}
    </div>
  )
}

// Insight card skeleton
export function InsightCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Skeleton className="w-4 h-4 rounded" />
          <Skeleton className="h-5 w-32" />
        </div>
        <Skeleton className="h-3 w-16" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    </div>
  )
}

// Quality score skeleton
export function QualityScoreSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Skeleton className="w-4 h-4 rounded" />
          <Skeleton className="h-5 w-28" />
        </div>
        <Skeleton className="h-3 w-20" />
      </div>
      <div className="flex items-center gap-4">
        <Skeleton className="w-16 h-16 rounded-full" />
        <div>
          <Skeleton className="h-5 w-16 rounded-full mb-2" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    </div>
  )
}

// Full dashboard skeleton
export function DashboardSkeleton() {
  return (
    <div className="space-y-4 animate-pulse-soft">
      {/* Quick stats */}
      <QuickStatsSkeleton />

      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-40 rounded-lg" />
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-4">
        <ChartSkeleton />
        <PieChartSkeleton />
      </div>

      {/* Top Ads */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="space-y-2">
          <AdRowSkeleton />
          <AdRowSkeleton />
          <AdRowSkeleton />
          <AdRowSkeleton />
          <AdRowSkeleton />
        </div>
      </div>

      {/* Insights row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <InsightCardSkeleton />
        <QualityScoreSkeleton />
        <InsightCardSkeleton />
      </div>
    </div>
  )
}

export default Skeleton
