import { Toast, showToast } from "@raycast/api";

/**
 * Performance measurement and optimization utilities.
 * @module
 */

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
}

interface MeasureOptions {
  error?: Error;
}

interface DebounceOptions {
  /** The delay in milliseconds */
  delay: number;
  /** Whether to call the function immediately on the first call */
  immediate?: boolean;
}

/**
 * Configuration options for performance monitoring.
 */
interface PerformanceConfig {
  /** Whether to enable performance monitoring */
  enabled: boolean;
  /** Threshold in milliseconds for slow operation warnings */
  slowThreshold: number;
  /** Whether to log performance metrics */
  logging: boolean;
}

class PerformanceMonitor {
  private static metrics: PerformanceMetric[] = [];
  private static thresholds: { [key: string]: number } = {
    default: 1000, // 1 second
    networkOperation: 5000, // 5 seconds
    fileOperation: 2000, // 2 seconds
  };

  /**
   * Starts a performance measurement.
   *
   * @param name - Label for the performance measurement
   */
  static startMeasure(name: string): void {
    this.metrics.push({
      name,
      startTime: performance.now(),
    });
  }

  /**
   * Ends a performance measurement.
   *
   * @param name - Label for the performance measurement
   * @returns The duration of the measurement in milliseconds
   */
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

  /**
   * Reports a slow operation.
   *
   * @param metric - Performance metric
   */
  private static async reportSlowOperation(metric: PerformanceMetric): Promise<void> {
    await showToast({
      style: Toast.Style.Failure,
      title: `Slow Operation Detected`,
      message: `${metric.name} took ${Math.round(metric.duration!)}ms`,
    });
  }

  /**
   * Gets all performance metrics.
   *
   * @returns An array of performance metrics
   */
  static getAllMetrics(): PerformanceMetric[] {
    return this.metrics;
  }

  /**
   * Clears all performance metrics.
   */
  static clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Sets a threshold for a specific operation.
   *
   * @param operation - Operation name
   * @param threshold - Threshold in milliseconds
   */
  static setThreshold(operation: string, threshold: number): void {
    this.thresholds[operation] = threshold;
  }

  /**
   * Logs a performance metric.
   *
   * @param name - Label for the performance measurement
   * @param duration - Duration of the measurement in milliseconds
   * @param options - Options for the measurement
   */
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

/**
 * Measures the execution time of an asynchronous function.
 *
 * @param name - Label for the performance measurement
 * @param fn - The asynchronous function to measure
 * @param options - Options for the measurement
 * @returns The result of the function
 *
 * @example
 * ```typescript
 * const result = await measureAsync(
 *   'Expensive Operation',
 *   async () => expensiveOperation()
 * );
 * ```
 */
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

/**
 * Measures the execution time of a synchronous function.
 *
 * @param name - Label for the performance measurement
 * @param fn - The synchronous function to measure
 * @param options - Options for the measurement
 * @returns The result of the function
 *
 * @example
 * ```typescript
 * const result = measure(
 *   'Expensive Operation',
 *   () => expensiveOperation()
 * );
 * ```
 */
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

/**
 * Creates a debounced version of a function that delays invoking the function
 * until after `delay` milliseconds have elapsed since the last time it was invoked.
 *
 * @param func - The function to debounce
 * @param options - Debounce configuration options
 * @returns A debounced version of the function
 *
 * @example
 * ```typescript
 * const debouncedSearch = debounce(async (query: string) => {
 *   const results = await searchAPI(query);
 *   updateResults(results);
 * }, { delay: 300 });
 * ```
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  { delay, immediate = false }: DebounceOptions
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, delay);
  };
}

/**
 * Creates a throttled version of a function that limits the number of times it can be invoked
 * within a given time period.
 *
 * @param func - The function to throttle
 * @param limit - The time period in milliseconds
 * @returns A throttled version of the function
 *
 * @example
 * ```typescript
 * const throttledUpdate = throttle(() => updateResults(), 1000);
 * ```
 */
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

/**
 * Measures the execution time of a function.
 *
 * @param fn - Function to measure
 * @param name - Optional name for the measurement
 * @returns Result of the function
 *
 * @example
 * ```typescript
 * const result = await measureTime(
 *   async () => await fetchData(),
 *   "fetchData"
 * );
 * ```
 */
export async function measureTime<T>(
  fn: () => Promise<T>,
  name?: string
): Promise<T> {
  const startTime = performance.now();
  try {
    const result = await fn();
    const endTime = performance.now();
    const duration = endTime - startTime;
    if (name) {
      PerformanceMonitor.logPerformance(name, duration, {});
    }
    return result;
  } catch (error) {
    const endTime = performance.now();
    const duration = endTime - startTime;
    if (name) {
      PerformanceMonitor.logPerformance(name, duration, { error });
    }
    throw error;
  }
}

/**
 * Debounces a function call.
 *
 * @param fn - Function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function
 *
 * @example
 * ```typescript
 * const debouncedSearch = debounce(
 *   (query) => searchDevices(query),
 *   300
 * );
 * ```
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      fn(...args);
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, delay);
  };
}

/**
 * Throttles a function call.
 *
 * @param fn - Function to throttle
 * @param limit - Time limit in milliseconds
 * @returns Throttled function
 *
 * @example
 * ```typescript
 * const throttledUpdate = throttle(
 *   () => updateUI(),
 *   100
 * );
 * ```
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Memoizes a function's results.
 *
 * @param fn - Function to memoize
 * @param resolver - Optional key resolver
 * @returns Memoized function
 *
 * @example
 * ```typescript
 * const memoizedFetch = memoize(
 *   (id) => fetchData(id),
 *   (id) => `data_${id}`
 * );
 * ```
 */
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  resolver?: (...args: Parameters<T>) => string
): (...args: Parameters<T>) => ReturnType<T> {
  const cache: { [key: string]: ReturnType<T> } = {};

  return function executedFunction(...args: Parameters<T>) {
    const key = resolver ? resolver(...args) : JSON.stringify(args);
    if (cache[key]) {
      return cache[key];
    }
    const result = fn(...args);
    cache[key] = result;
    return result;
  };
}

/**
 * Configures performance monitoring.
 *
 * @param config - Performance configuration
 *
 * @example
 * ```typescript
 * configurePerformance({
 *   enabled: true,
 *   slowThreshold: 1000,
 *   logging: true
 * });
 * ```
 */
export function configurePerformance(config: Partial<PerformanceConfig>): void {
  // TO DO: implement performance configuration
}

export const PerformanceMetrics = PerformanceMonitor;
