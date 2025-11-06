/**
 * Performance Metrics Collector for LLM Applications
 *
 * Tracks and analyzes performance metrics for LLM operations:
 * - Latency: Response time in milliseconds
 * - Tokens: Input, output, and total token counts
 * - Cost: Estimated cost based on token usage and model pricing
 * - Throughput: Requests per second, tokens per second
 * - Percentiles: P50, P95, P99 latency distribution
 *
 * Why Performance Tracking for LLMs?
 * LLMs have unique performance characteristics:
 * - Variable latency (depends on output length)
 * - Token-based pricing (costs vary by usage)
 * - High variance in response times
 * - Need to track cost vs quality trade-offs
 *
 * Performance Goals:
 * - P95 latency < 2000ms (acceptable for most use cases)
 * - P99 latency < 5000ms (edge case handling)
 * - Cost per request < $0.01 (for local models, minimal cost)
 * - Throughput > 10 req/s (for production workloads)
 *
 * Usage Example:
 * ```typescript
 * const collector = new PerformanceCollector();
 * const metric = collector.startRequest();
 *
 * // ... make LLM call ...
 *
 * metric.end({ inputTokens: 100, outputTokens: 50, model: 'llama3.1:8b' });
 *
 * const report = collector.generateReport();
 * console.log(`P95 latency: ${report.p95Latency}ms`);
 * console.log(`Total cost: $${report.totalCost}`);
 * ```
 */

/**
 * Model Pricing Information
 *
 * Pricing per 1M tokens for various models.
 * Local models (Ollama) are free but included for comparison.
 */
export const MODEL_PRICING = {
  // Local models (Ollama) - free
  'llama3.1:8b': { input: 0, output: 0 },
  'llama3.2:latest': { input: 0, output: 0 },
  'mistral:7b': { input: 0, output: 0 },

  // Commercial models (for reference/comparison)
  'gpt-4': { input: 30.0, output: 60.0 },
  'gpt-4-turbo': { input: 10.0, output: 30.0 },
  'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
  'claude-3-opus': { input: 15.0, output: 75.0 },
  'claude-3-sonnet': { input: 3.0, output: 15.0 },
  'claude-3-haiku': { input: 0.25, output: 1.25 },
} as const;

/**
 * Performance Metric for a Single Request
 */
export interface PerformanceMetric {
  requestId: string;
  startTime: number;
  endTime?: number;
  latency?: number;  // in milliseconds
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  model?: string;
  cost?: number;  // in dollars
  success: boolean;
  error?: string;
}

/**
 * Token Usage Information
 */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  model: string;
}

/**
 * Performance Report
 */
export interface PerformanceReport {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  errorRate: number;  // 0.0 - 1.0

  // Latency metrics (in milliseconds)
  meanLatency: number;
  medianLatency: number;
  p95Latency: number;
  p99Latency: number;
  minLatency: number;
  maxLatency: number;
  stdDeviation: number;

  // Token metrics
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  meanInputTokens: number;
  meanOutputTokens: number;

  // Cost metrics (in dollars)
  totalCost: number;
  meanCost: number;

  // Throughput metrics
  duration: number;  // in seconds
  requestsPerSecond: number;
  tokensPerSecond: number;

  // Time range
  startTime: Date;
  endTime: Date;
}

/**
 * Performance Collector Class
 */
export class PerformanceCollector {
  private metrics: PerformanceMetric[] = [];
  private activeRequests: Map<string, PerformanceMetric> = new Map();
  private requestCounter = 0;

  /**
   * Start Tracking a New Request
   *
   * Returns a request handle that can be used to end the request
   * and record its metrics.
   *
   * @returns Request handle with end() method
   */
  startRequest(): RequestHandle {
    const requestId = `req_${++this.requestCounter}_${Date.now()}`;
    const metric: PerformanceMetric = {
      requestId,
      startTime: Date.now(),
      success: true,
    };

    this.activeRequests.set(requestId, metric);

    return {
      requestId,
      end: (usage?: TokenUsage, error?: string) => {
        this.endRequest(requestId, usage, error);
      },
    };
  }

  /**
   * End Request and Record Metrics
   *
   * @param requestId - Request identifier
   * @param usage - Token usage information (optional)
   * @param error - Error message if request failed (optional)
   */
  private endRequest(requestId: string, usage?: TokenUsage, error?: string): void {
    const metric = this.activeRequests.get(requestId);
    if (!metric) {
      throw new Error(`Request ${requestId} not found`);
    }

    metric.endTime = Date.now();
    metric.latency = metric.endTime - metric.startTime;

    if (error) {
      metric.success = false;
      metric.error = error;
    }

    if (usage) {
      metric.inputTokens = usage.inputTokens;
      metric.outputTokens = usage.outputTokens;
      metric.totalTokens = usage.inputTokens + usage.outputTokens;
      metric.model = usage.model;
      metric.cost = this.calculateCost(usage);
    }

    this.metrics.push(metric);
    this.activeRequests.delete(requestId);
  }

  /**
   * Calculate Cost for Token Usage
   *
   * @param usage - Token usage information
   * @returns Cost in dollars
   */
  private calculateCost(usage: TokenUsage): number {
    const pricing = MODEL_PRICING[usage.model as keyof typeof MODEL_PRICING];

    if (!pricing) {
      // Unknown model, assume free (local model)
      return 0;
    }

    // Pricing is per 1M tokens, so divide by 1,000,000
    const inputCost = (usage.inputTokens / 1_000_000) * pricing.input;
    const outputCost = (usage.outputTokens / 1_000_000) * pricing.output;

    return inputCost + outputCost;
  }

  /**
   * Record a Complete Metric Manually
   *
   * Alternative to startRequest/endRequest for pre-computed metrics.
   *
   * @param metric - Complete performance metric
   */
  recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
  }

  /**
   * Get All Recorded Metrics
   *
   * @returns Array of all performance metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Get Metrics Filtered by Success/Failure
   *
   * @param success - Filter by success status
   * @returns Filtered metrics
   */
  getMetricsByStatus(success: boolean): PerformanceMetric[] {
    return this.metrics.filter((m) => m.success === success);
  }

  /**
   * Get Metrics Filtered by Model
   *
   * @param model - Model name
   * @returns Filtered metrics
   */
  getMetricsByModel(model: string): PerformanceMetric[] {
    return this.metrics.filter((m) => m.model === model);
  }

  /**
   * Clear All Metrics
   *
   * Useful for starting a new test run.
   */
  clear(): void {
    this.metrics = [];
    this.activeRequests.clear();
    this.requestCounter = 0;
  }

  /**
   * Generate Performance Report
   *
   * Analyzes all recorded metrics and generates a comprehensive report
   * with latency percentiles, token usage, cost, and throughput.
   *
   * @returns Performance report
   */
  generateReport(): PerformanceReport {
    if (this.metrics.length === 0) {
      throw new Error('No metrics recorded');
    }

    const successful = this.metrics.filter((m) => m.success);
    const failed = this.metrics.filter((m) => !m.success);

    // Calculate latency statistics
    const latencies = successful
      .map((m) => m.latency!)
      .filter((l) => l !== undefined)
      .sort((a, b) => a - b);

    // Guard against empty latencies array (all requests failed or no latency data)
    if (latencies.length === 0) {
      throw new Error('No successful requests with latency data to generate report');
    }

    const meanLatency = this.mean(latencies);
    const stdDeviation = this.standardDeviation(latencies, meanLatency);

    // Calculate token statistics
    const inputTokens = successful.map((m) => m.inputTokens || 0);
    const outputTokens = successful.map((m) => m.outputTokens || 0);
    const costs = successful.map((m) => m.cost || 0);

    // Calculate time range
    const startTimes = this.metrics.map((m) => m.startTime);
    const endTimes = this.metrics.map((m) => m.endTime || m.startTime);
    const minTime = Math.min(...startTimes);
    const maxTime = Math.max(...endTimes);

    // Clamp duration to minimum epsilon to prevent division by zero
    // For single fast requests, duration could be 0ms, leading to Infinity throughput
    const MIN_DURATION_SECONDS = 0.001; // 1ms minimum
    const durationRaw = (maxTime - minTime) / 1000; // in seconds
    const duration = Math.max(durationRaw, MIN_DURATION_SECONDS);

    // Calculate totals
    const totalInputTokens = this.sum(inputTokens);
    const totalOutputTokens = this.sum(outputTokens);
    const totalTokens = totalInputTokens + totalOutputTokens;
    const totalCost = this.sum(costs);

    return {
      totalRequests: this.metrics.length,
      successfulRequests: successful.length,
      failedRequests: failed.length,
      errorRate: failed.length / this.metrics.length,

      meanLatency,
      medianLatency: this.percentile(latencies, 50),
      p95Latency: this.percentile(latencies, 95),
      p99Latency: this.percentile(latencies, 99),
      minLatency: Math.min(...latencies),
      maxLatency: Math.max(...latencies),
      stdDeviation,

      totalInputTokens,
      totalOutputTokens,
      totalTokens,
      meanInputTokens: this.mean(inputTokens),
      meanOutputTokens: this.mean(outputTokens),

      totalCost,
      meanCost: this.mean(costs),

      duration,
      requestsPerSecond: this.metrics.length / duration,
      tokensPerSecond: totalTokens / duration,

      startTime: new Date(minTime),
      endTime: new Date(maxTime),
    };
  }

  /**
   * Generate Formatted Report Text
   *
   * @returns Human-readable report
   */
  generateReportText(): string {
    const report = this.generateReport();

    return `
Performance Report
==================

Requests:
  Total: ${report.totalRequests}
  Successful: ${report.successfulRequests}
  Failed: ${report.failedRequests}
  Error Rate: ${(report.errorRate * 100).toFixed(2)}%

Latency (ms):
  Mean: ${report.meanLatency.toFixed(2)}
  Median: ${report.medianLatency.toFixed(2)}
  P95: ${report.p95Latency.toFixed(2)}
  P99: ${report.p99Latency.toFixed(2)}
  Min: ${report.minLatency.toFixed(2)}
  Max: ${report.maxLatency.toFixed(2)}
  Std Dev: ${report.stdDeviation.toFixed(2)}

Tokens:
  Total Input: ${report.totalInputTokens.toLocaleString()}
  Total Output: ${report.totalOutputTokens.toLocaleString()}
  Total: ${report.totalTokens.toLocaleString()}
  Mean Input: ${report.meanInputTokens.toFixed(0)}
  Mean Output: ${report.meanOutputTokens.toFixed(0)}

Cost:
  Total: $${report.totalCost.toFixed(6)}
  Mean per Request: $${report.meanCost.toFixed(6)}

Throughput:
  Duration: ${report.duration.toFixed(2)}s
  Requests/sec: ${report.requestsPerSecond.toFixed(2)}
  Tokens/sec: ${report.tokensPerSecond.toFixed(0)}

Time Range:
  Start: ${report.startTime.toISOString()}
  End: ${report.endTime.toISOString()}
`.trim();
  }

  /**
   * Check if Performance Meets SLO (Service Level Objective)
   *
   * @param slo - Service level objective thresholds
   * @returns Whether metrics meet SLO
   */
  checkSLO(slo: PerformanceSLO): SLOResult {
    const report = this.generateReport();
    const violations: string[] = [];

    if (report.p95Latency > slo.maxP95Latency) {
      violations.push(
        `P95 latency ${report.p95Latency.toFixed(0)}ms exceeds SLO ${slo.maxP95Latency}ms`
      );
    }

    if (report.p99Latency > slo.maxP99Latency) {
      violations.push(
        `P99 latency ${report.p99Latency.toFixed(0)}ms exceeds SLO ${slo.maxP99Latency}ms`
      );
    }

    if (report.errorRate > slo.maxErrorRate) {
      violations.push(
        `Error rate ${(report.errorRate * 100).toFixed(1)}% exceeds SLO ${(slo.maxErrorRate * 100).toFixed(1)}%`
      );
    }

    if (slo.minThroughput && report.requestsPerSecond < slo.minThroughput) {
      violations.push(
        `Throughput ${report.requestsPerSecond.toFixed(1)} req/s below SLO ${slo.minThroughput} req/s`
      );
    }

    if (slo.maxCostPerRequest && report.meanCost > slo.maxCostPerRequest) {
      violations.push(
        `Mean cost $${report.meanCost.toFixed(6)} exceeds SLO $${slo.maxCostPerRequest.toFixed(6)}`
      );
    }

    return {
      passed: violations.length === 0,
      violations,
      report,
    };
  }

  // Statistical helper methods

  private mean(values: number[]): number {
    if (values.length === 0) return 0;
    return this.sum(values) / values.length;
  }

  private sum(values: number[]): number {
    return values.reduce((a, b) => a + b, 0);
  }

  private standardDeviation(values: number[], mean: number): number {
    if (values.length === 0) return 0;
    const variance =
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      values.length;
    return Math.sqrt(variance);
  }

  private percentile(sortedValues: number[], p: number): number {
    if (sortedValues.length === 0) return 0;
    const index = Math.ceil((p / 100) * sortedValues.length) - 1;
    return sortedValues[Math.max(0, Math.min(index, sortedValues.length - 1))];
  }
}

/**
 * Request Handle
 *
 * Returned by startRequest() to track and end a request.
 */
export interface RequestHandle {
  requestId: string;
  end: (usage?: TokenUsage, error?: string) => void;
}

/**
 * Service Level Objective (SLO)
 *
 * Defines performance thresholds for the system.
 */
export interface PerformanceSLO {
  maxP95Latency: number;  // in milliseconds
  maxP99Latency: number;  // in milliseconds
  maxErrorRate: number;  // 0.0 - 1.0 (e.g., 0.01 = 1%)
  minThroughput?: number;  // requests per second
  maxCostPerRequest?: number;  // in dollars
}

/**
 * SLO Check Result
 */
export interface SLOResult {
  passed: boolean;
  violations: string[];
  report: PerformanceReport;
}
