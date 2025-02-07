import { Toast, showToast } from "@raycast/api";

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
}

interface MeasureOptions {
  error?: Error;
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
    const metric = this.metrics.find((m) => m.name === name && !m.endTime);
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

  private static logPerformance(name: string, duration: number, options: MeasureOptions): void {
    const metric: PerformanceMetric = {
      name,
      startTime: performance.now() - duration,
      endTime: performance.now(),
      duration,
    };

    if (options.error) {
      console.error(`Error in ${name}: ${options.error.message}`);
    }

    const threshold = this.thresholds[name] || this.thresholds.default;
    if (duration > threshold) {
      this.reportSlowOperation(metric);
    }

    this.metrics.push(metric);
  }
}

export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>,
  options: MeasureOptions = {}
): Promise<T> {
  PerformanceMonitor.startMeasure(name);
  try {
    const result = await fn();
    PerformanceMonitor.endMeasure(name);
    return result;
  } catch (error) {
    PerformanceMonitor.endMeasure(name);
    throw error;
  }
}

export function measure<T>(
  name: string,
  fn: () => T,
  options: MeasureOptions = {}
): T {
  PerformanceMonitor.startMeasure(name);
  try {
    const result = fn();
    PerformanceMonitor.endMeasure(name);
    return result;
  } catch (error) {
    PerformanceMonitor.endMeasure(name);
    throw error;
  }
}

export function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
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

export function throttle<T extends (...args: any[]) => any>(func: T, limit: number): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

export const PerformanceMetrics = PerformanceMonitor;
