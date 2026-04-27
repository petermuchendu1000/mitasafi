/**
 * Client-Side Performance Monitoring
 * 
 * Tracks React component render times, data fetching, and user interactions.
 * Uses browser's Performance API for accurate measurements.
 */

'use client'

import { useEffect, useRef, useState } from 'react'

interface ComponentMetric {
  component: string
  mountTime?: number
  renderTime?: number
  hydrationTime?: number
  dataFetchTime?: number
  timestamp: number
}

class ClientPerformanceMonitor {
  private metrics: ComponentMetric[] = []
  private marks: Map<string, number> = new Map()

  /**
   * Mark the start of an operation
   */
  mark(name: string): void {
    const markName = `perf-${name}-start`
    performance.mark(markName)
    this.marks.set(name, performance.now())
  }

  /**
   * Measure the duration since mark
   */
  measure(name: string): number {
    const startTime = this.marks.get(name)
    if (!startTime) {
      console.warn(`[ClientPerf] No mark found for: ${name}`)
      return 0
    }

    const duration = performance.now() - startTime
    this.marks.delete(name)
    
    return duration
  }

  /**
   * Log component metric
   */
  logComponent(metric: ComponentMetric): void {
    this.metrics.push(metric)
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      const emoji = this.getPerformanceEmoji(metric.renderTime || 0)
      console.log(
        `${emoji} [Component] ${metric.component}`,
        metric
      )
    }
  }

  /**
   * Get all metrics
   */
  getMetrics(): ComponentMetric[] {
    return this.metrics
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = []
    this.marks.clear()
  }

  /**
   * Get performance summary
   */
  getSummary(): {
    totalComponents: number
    avgRenderTime: number
    slowestComponents: ComponentMetric[]
  } {
    const totalComponents = this.metrics.length
    const avgRenderTime = this.metrics.reduce((sum, m) => sum + (m.renderTime || 0), 0) / totalComponents
    const slowestComponents = [...this.metrics]
      .sort((a, b) => (b.renderTime || 0) - (a.renderTime || 0))
      .slice(0, 10)

    return {
      totalComponents,
      avgRenderTime,
      slowestComponents,
    }
  }

  private getPerformanceEmoji(duration: number): string {
    if (duration < 16) return '🟢' // Fast (< 1 frame)
    if (duration < 50) return '🟡' // OK
    if (duration < 100) return '🟠' // Slow
    return '🔴' // Very slow
  }
}

// Global client performance monitor
export const clientPerf = new ClientPerformanceMonitor()

/**
 * Hook to monitor component performance
 */
export function useComponentPerformance(componentName: string) {
  const mountTimeRef = useRef<number>(0)
  const renderCountRef = useRef<number>(0)

  useEffect(() => {
    mountTimeRef.current = performance.now()
    const markName = `${componentName}-mount`
    clientPerf.mark(markName)

    return () => {
      const mountDuration = clientPerf.measure(markName)
      clientPerf.logComponent({
        component: componentName,
        mountTime: mountDuration,
        timestamp: Date.now(),
      })
    }
  }, [componentName])

  useEffect(() => {
    renderCountRef.current++
  })

  return {
    renderCount: renderCountRef.current,
  }
}

/**
 * Hook to measure data fetching performance
 */
export function useDataFetchPerformance(operationName: string) {
  const startAsync = () => {
    const markName = `${operationName}-fetch`
    clientPerf.mark(markName)
    return markName
  }

  const endAsync = (markName: string) => {
    const duration = clientPerf.measure(markName)
    
    if (process.env.NODE_ENV === 'development') {
      const emoji = duration < 100 ? '🟢' : duration < 500 ? '🟡' : '🔴'
      console.log(`${emoji} [Data Fetch] ${operationName}: ${duration.toFixed(2)}ms`)
    }
    
    return duration
  }

  return { startAsync, endAsync }
}

/**
 * Measure async operation (hook version)
 */
export function useMeasureAsync() {
  return async <T,>(
    name: string,
    fn: () => Promise<T>
  ): Promise<T> => {
    const markName = `async-${name}`
    clientPerf.mark(markName)
    
    try {
      const result = await fn()
      const duration = clientPerf.measure(markName)
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`⏱️  [Async] ${name}: ${duration.toFixed(2)}ms`)
      }
      
      return result
    } catch (error) {
      clientPerf.measure(markName)
      throw error
    }
  }
}

/**
 * Performance observer for tracking page loads
 */
export function usePageLoadPerformance() {
  useEffect(() => {
    // Wait for page to fully load
    if (typeof window === 'undefined') return

    const logPagePerformance = () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      
      if (!navigation) return

      const metrics = {
        dns: navigation.domainLookupEnd - navigation.domainLookupStart,
        tcp: navigation.connectEnd - navigation.connectStart,
        request: navigation.responseStart - navigation.requestStart,
        response: navigation.responseEnd - navigation.responseStart,
        dom: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        load: navigation.loadEventEnd - navigation.loadEventStart,
        total: navigation.loadEventEnd - navigation.fetchStart,
      }

      console.log('\n' + '='.repeat(80))
      console.log('🚀 PAGE LOAD PERFORMANCE')
      console.log('='.repeat(80))
      console.log(`📡 DNS Lookup:           ${metrics.dns.toFixed(2)}ms`)
      console.log(`🔌 TCP Connection:       ${metrics.tcp.toFixed(2)}ms`)
      console.log(`📤 Request:              ${metrics.request.toFixed(2)}ms`)
      console.log(`📥 Response:             ${metrics.response.toFixed(2)}ms`)
      console.log(`📄 DOM Processing:       ${metrics.dom.toFixed(2)}ms`)
      console.log(`⚡ Page Load:            ${metrics.load.toFixed(2)}ms`)
      console.log(`📊 TOTAL:                ${metrics.total.toFixed(2)}ms`)
      console.log('='.repeat(80) + '\n')

      // Log component summary
      const summary = clientPerf.getSummary()
      if (summary.totalComponents > 0) {
        console.log('📦 COMPONENT PERFORMANCE')
        console.log('='.repeat(80))
        console.log(`Total Components:        ${summary.totalComponents}`)
        console.log(`Avg Render Time:         ${summary.avgRenderTime.toFixed(2)}ms`)
        console.log('\nSlowest Components:')
        summary.slowestComponents.forEach((comp, i) => {
          console.log(`  ${i + 1}. ${comp.component}: ${(comp.renderTime || 0).toFixed(2)}ms`)
        })
        console.log('='.repeat(80) + '\n')
      }
    }

    // Log when page is fully loaded
    if (document.readyState === 'complete') {
      setTimeout(logPagePerformance, 100)
    } else {
      window.addEventListener('load', () => {
        setTimeout(logPagePerformance, 100)
      })
    }
  }, [])
}

/**
 * Track navigation timing
 */
export function useNavigationPerformance() {
  const [navigationTime, setNavigationTime] = useState<number>(0)

  useEffect(() => {
    const startTime = performance.now()

    return () => {
      const duration = performance.now() - startTime
      setNavigationTime(duration)
      
      if (process.env.NODE_ENV === 'development' && duration > 100) {
        console.log(`🧭 Navigation took: ${duration.toFixed(2)}ms`)
      }
    }
  }, [])

  return navigationTime
}

/**
 * HOC to wrap component with performance monitoring
 */
export function withPerformanceMonitoring<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
) {
  const WrappedComponent = (props: P) => {
    const name = componentName || Component.displayName || Component.name || 'UnknownComponent'
    const renderStart = useRef<number>(performance.now())

    useEffect(() => {
      const renderTime = performance.now() - renderStart.current
      clientPerf.logComponent({
        component: name,
        renderTime,
        timestamp: Date.now(),
      })
    })

    return <Component {...props} />
  }

  WrappedComponent.displayName = `withPerformance(${componentName || Component.displayName || Component.name})`
  
  return WrappedComponent
}
