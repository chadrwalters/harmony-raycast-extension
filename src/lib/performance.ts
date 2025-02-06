import { Toast, showToast } from '@raycast/api';

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
}

class PerformanceMonitor {
  private static metrics: PerformanceMetric[] = [];
  private static thresholds: { [key: string]: number } = {
    default: 1000, // 1 second
    networkOperation: 5000, // 5 seconds
    fileOperation: 2000, // 2 seconds
  };

  static startMeasure(name: string): void {
    this.metrics.push({
      name,
      startTime: performance.now(),
    });
  }

  static endMeasure(name: string): number {
    const metric = this.metrics.find(m => m.name === name && !m.endTime);
    if (!metric) {
      console.warn(`No active measurement found for: ${name}`);
      return 0;
    }

    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;

    const threshold = this.thresholds[name] || this.thresholds.default;
    if (metric.duration > threshold) {
      this.reportSlowOperation(metric);
    }

    return metric.duration;
  }

  private static async reportSlowOperation(metric: PerformanceMetric): Promise<void> {
    await showToast({
      style: Toast.Style.Failure,
      title: `Slow Operation Detected`,
      message: `${metric.name} took ${Math.round(metric.duration!)}ms`,
    });
  }

  static getAllMetrics(): PerformanceMetric[] {
    return this.metrics;
  }

  static clearMetrics(): void {
    this.metrics = [];
  }

  static setThreshold(operation: string, threshold: number): void {
    this.thresholds[operation] = threshold;
  }
}

export function measure<T>(name: string, fn: () => T): T {
  PerformanceMonitor.startMeasure(name);
  try {
    return fn();
  } finally {
    PerformanceMonitor.endMeasure(name);
  }
}

export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  PerformanceMonitor.startMeasure(name);
  try {
    return await fn();
  } finally {
    PerformanceMonitor.endMeasure(name);
  }
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

export const PerformanceMetrics = PerformanceMonitor;
