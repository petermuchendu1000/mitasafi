/**
 * Performance Logger
 * 
 * Comprehensive performance monitoring system that tracks:
 * - Function execution times
 * - Database query durations
 * - API call latencies
 * - Component render times
 * - Compilation times
 * 
 * Usage:
 * const perf = new PerformanceLogger('MyOperation')
 * perf.start('step1')
 * // do work
 * perf.end('step1')
 * perf.logSummary()
 */

export interface PerformanceMetric {
  name: string
  startTime: number
  endTime?: number
  duration?: number
  metadata?: Record<string, any>
}

export interface PerformanceSummary {
  operation: string
  totalDuration: number
  metrics: PerformanceMetric[]
  timestamp: string
}

export class PerformanceLogger {
  private operation: string
  private metrics: Map<string, PerformanceMetric> = new Map()
  private startTime: number
  private metadata: Record<string, any> = {}

  constructor(operation: string, metadata?: Record<string, any>) {
    this.operation = operation
    this.startTime = performance.now()
    if (metadata) {
      this.metadata = metadata
    }
  }

  /**
   * Start timing a specific step
   */
  start(name: string, metadata?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      name,
      startTime: performance.now(),
      metadata,
    }
    this.metrics.set(name, metric)
  }

  /**
   * End timing a specific step
   */
  end(name: string, metadata?: Record<string, any>): number {
    const metric = this.metrics.get(name)
    if (!metric) {
      console.warn(`[Performance] Metric "${name}" not found`)
      return 0
    }

    metric.endTime = performance.now()
    metric.duration = metric.endTime - metric.startTime

    if (metadata) {
      metric.metadata = { ...metric.metadata, ...metadata }
    }

    return metric.duration
  }

  /**
   * Get duration of a specific step
   */
  getDuration(name: string): number | undefined {
    return this.metrics.get(name)?.duration
  }

  /**
   * Get all metrics
   */
  getMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values())
  }

  /**
   * Get summary of all timings
   */
  getSummary(): PerformanceSummary {
    const totalDuration = performance.now() - this.startTime
    return {
      operation: this.operation,
      totalDuration,
      metrics: this.getMetrics().map(m => ({
        ...m,
        duration: m.duration || 0,
      })),
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * Log summary to console with formatted output
   */
  logSummary(threshold: number = 0): void {
    const summary = this.getSummary()
    
    // Only log if total duration exceeds threshold
    if (summary.totalDuration < threshold) {
      return
    }

    console.log('\n' + '='.repeat(80))
    console.log(`⚡ PERFORMANCE: ${this.operation}`)
    console.log('='.repeat(80))
    console.log(`📊 Total Duration: ${this.formatDuration(summary.totalDuration)}`)
    
    if (Object.keys(this.metadata).length > 0) {
      console.log(`📝 Context:`, this.metadata)
    }
    
    console.log('\n📈 Breakdown:')
    
    // Sort metrics by duration (descending)
    const sortedMetrics = summary.metrics
      .filter(m => m.duration !== undefined)
      .sort((a, b) => (b.duration || 0) - (a.duration || 0))

    sortedMetrics.forEach((metric, index) => {
      const percentage = ((metric.duration || 0) / summary.totalDuration * 100).toFixed(1)
      const icon = this.getPerformanceIcon(metric.duration || 0)
      
      console.log(
        `  ${icon} ${index + 1}. ${metric.name.padEnd(30)} ${this.formatDuration(metric.duration || 0).padStart(10)} (${percentage}%)`
      )
      
      if (metric.metadata && Object.keys(metric.metadata).length > 0) {
        console.log(`     └─ ${JSON.stringify(metric.metadata)}`)
      }
    })
    
    console.log('='.repeat(80) + '\n')
  }

  /**
   * Log to structured format (for production monitoring)
   */
  logStructured(): void {
    const summary = this.getSummary()
    console.log(JSON.stringify({
      type: 'performance',
      ...summary,
    }))
  }

  /**
   * Format duration in human-readable format
   */
  private formatDuration(ms: number): string {
    if (ms < 1) {
      return `${ms.toFixed(3)}ms`
    } else if (ms < 1000) {
      return `${ms.toFixed(1)}ms`
    } else {
      return `${(ms / 1000).toFixed(2)}s`
    }
  }

  /**
   * Get icon based on performance
   */
  private getPerformanceIcon(duration: number): string {
    if (duration < 10) return '🟢'   // Fast
    if (duration < 50) return '🟡'   // Okay
    if (duration < 200) return '🟠'  // Slow
    return '🔴'                       // Very Slow
  }

  /**
   * Create a child logger for nested operations
   */
  child(operation: string, metadata?: Record<string, any>): PerformanceLogger {
    return new PerformanceLogger(`${this.operation} > ${operation}`, metadata)
  }
}

/**
 * Async function wrapper with automatic performance tracking
 */
export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>,
  logger?: PerformanceLogger
): Promise<T> {
  const perf = logger || new PerformanceLogger(name)
  perf.start(name)
  
  try {
    const result = await fn()
    perf.end(name)
    return result
  } catch (error) {
    perf.end(name, { error: true })
    throw error
  } finally {
    if (!logger) {
      perf.logSummary()
    }
  }
}

/**
 * Sync function wrapper with automatic performance tracking
 */
export function measureSync<T>(
  name: string,
  fn: () => T,
  logger?: PerformanceLogger
): T {
  const perf = logger || new PerformanceLogger(name)
  perf.start(name)
  
  try {
    const result = fn()
    perf.end(name)
    return result
  } catch (error) {
    perf.end(name, { error: true })
    throw error
  } finally {
    if (!logger) {
      perf.logSummary()
    }
  }
}

/**
 * Database query wrapper with performance tracking
 */
export async function measureQuery<T>(
  queryName: string,
  query: Promise<T>,
  logger?: PerformanceLogger
): Promise<T> {
  const perf = logger || new PerformanceLogger('Database Query')
  perf.start(queryName)
  
  try {
    const result = await query
    perf.end(queryName)
    return result
  } catch (error) {
    perf.end(queryName, { error: true })
    throw error
  } finally {
    if (!logger) {
      perf.logSummary(100) // Only log queries that take >100ms
    }
  }
}

/**
 * Simple performance timer for quick measurements
 */
export class PerfTimer {
  private startTime: number

  constructor() {
    this.startTime = performance.now()
  }

  elapsed(): number {
    return performance.now() - this.startTime
  }

  log(label: string): void {
    console.log(`⏱️  ${label}: ${this.elapsed().toFixed(2)}ms`)
  }
}
