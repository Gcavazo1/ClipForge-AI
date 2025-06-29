import { logger } from '../logger';

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface PerformanceThresholds {
  warning: number;
  error: number;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetric[] = [];
  private activeTimers = new Map<string, number>();
  
  private thresholds: Record<string, PerformanceThresholds> = {
    'video-upload': { warning: 30000, error: 60000 },
    'transcription': { warning: 120000, error: 300000 },
    'highlight-detection': { warning: 10000, error: 30000 },
    'database-query': { warning: 1000, error: 5000 },
    'api-request': { warning: 2000, error: 10000 },
    'video-processing': { warning: 60000, error: 180000 }
  };

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // Start timing an operation
  startTimer(operationId: string, metadata?: Record<string, any>): void {
    this.activeTimers.set(operationId, performance.now());
    
    logger.debug('Performance timer started', { 
      operationId, 
      metadata 
    });
  }

  // End timing and record metric
  endTimer(operationId: string, metadata?: Record<string, any>): number {
    const startTime = this.activeTimers.get(operationId);
    
    if (!startTime) {
      logger.warn('Performance timer not found', { operationId });
      return 0;
    }

    const duration = performance.now() - startTime;
    this.activeTimers.delete(operationId);

    const metric: PerformanceMetric = {
      name: operationId,
      duration,
      timestamp: Date.now(),
      metadata
    };

    this.metrics.push(metric);
    this.checkThresholds(metric);

    // Keep only last 1000 metrics
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    logger.debug('Performance timer ended', { 
      operationId, 
      duration: Math.round(duration),
      metadata 
    });

    return duration;
  }

  // Measure async operation
  async measure<T>(
    operationId: string,
    operation: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    this.startTimer(operationId, metadata);
    
    try {
      const result = await operation();
      this.endTimer(operationId, { ...metadata, success: true });
      return result;
    } catch (error) {
      this.endTimer(operationId, { ...metadata, success: false, error: (error as Error).message });
      throw error;
    }
  }

  // Measure sync operation
  measureSync<T>(
    operationId: string,
    operation: () => T,
    metadata?: Record<string, any>
  ): T {
    this.startTimer(operationId, metadata);
    
    try {
      const result = operation();
      this.endTimer(operationId, { ...metadata, success: true });
      return result;
    } catch (error) {
      this.endTimer(operationId, { ...metadata, success: false, error: (error as Error).message });
      throw error;
    }
  }

  // Check performance thresholds
  private checkThresholds(metric: PerformanceMetric): void {
    const operationType = metric.name.split('-')[0];
    const threshold = this.thresholds[operationType] || this.thresholds[metric.name];

    if (!threshold) return;

    if (metric.duration > threshold.error) {
      logger.error('Performance threshold exceeded (ERROR)', new Error('Slow operation'), {
        operation: metric.name,
        duration: metric.duration,
        threshold: threshold.error,
        metadata: metric.metadata
      });
    } else if (metric.duration > threshold.warning) {
      logger.warn('Performance threshold exceeded (WARNING)', {
        operation: metric.name,
        duration: metric.duration,
        threshold: threshold.warning,
        metadata: metric.metadata
      });
    }
  }

  // Get performance statistics
  getStats(operationName?: string): {
    count: number;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
    p95Duration: number;
    recentMetrics: PerformanceMetric[];
  } {
    const filteredMetrics = operationName 
      ? this.metrics.filter(m => m.name === operationName)
      : this.metrics;

    if (filteredMetrics.length === 0) {
      return {
        count: 0,
        avgDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        p95Duration: 0,
        recentMetrics: []
      };
    }

    const durations = filteredMetrics.map(m => m.duration).sort((a, b) => a - b);
    const p95Index = Math.floor(durations.length * 0.95);

    return {
      count: filteredMetrics.length,
      avgDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      minDuration: durations[0],
      maxDuration: durations[durations.length - 1],
      p95Duration: durations[p95Index] || 0,
      recentMetrics: filteredMetrics.slice(-10)
    };
  }

  // Set custom thresholds
  setThresholds(operationName: string, thresholds: PerformanceThresholds): void {
    this.thresholds[operationName] = thresholds;
  }

  // Clear metrics
  clearMetrics(): void {
    this.metrics = [];
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance();

// Decorator for automatic performance monitoring
export function measurePerformance(operationName?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const operation = operationName || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      return performanceMonitor.measure(
        operation,
        () => originalMethod.apply(this, args),
        { args: args.length }
      );
    };

    return descriptor;
  };
}