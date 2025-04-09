/**
 * Utility for measuring API call performance
 */
import { performance } from 'perf_hooks';

// Interface for timing data
export interface TimingData {
  operation: string;
  durationMs: number;
  timestamp: number;
}

// Store all timing data
const timings: TimingData[] = [];

/**
 * Times the execution of an async function
 * @param operationName Name of the operation being timed
 * @param fn Async function to time
 * @returns The result of the function
 */
export async function timeOperation<T>(operationName: string, fn: () => Promise<T>): Promise<T> {
  const startTime = performance.now();
  try {
    return await fn();
  } finally {
    const endTime = performance.now();
    const durationMs = endTime - startTime;
    
    // Log the timing
    console.log(`${operationName} completed in ${durationMs.toFixed(2)}ms`);
    
    // Store the timing data
    timings.push({
      operation: operationName,
      durationMs,
      timestamp: Date.now()
    });
  }
}

/**
 * Get all recorded timings
 */
export function getTimings(): TimingData[] {
  return [...timings];
}

/**
 * Clear all recorded timings
 */
export function clearTimings(): void {
  timings.length = 0;
}

/**
 * Get a summary of all timings
 */
export function getTimingSummary(): Record<string, number> {
  const summary: Record<string, number> = {};
  
  for (const timing of timings) {
    if (!summary[timing.operation]) {
      summary[timing.operation] = timing.durationMs;
    } else {
      summary[timing.operation] += timing.durationMs;
    }
  }
  
  return summary;
}
