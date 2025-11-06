/**
 * Metrics Aggregator for Test Results
 *
 * Collects and aggregates test results over time to enable:
 * - Trend analysis (quality/performance over time)
 * - Regression detection (degradation alerts)
 * - Historical comparison (before/after model changes)
 * - Dashboard reporting (current system health)
 *
 * Why Monitoring for LLM Testing?
 * - Detect quality regressions when models are updated
 * - Track performance trends (latency increases over time)
 * - Alert on SLO violations
 * - Measure impact of prompt engineering changes
 * - Compare A/B test results
 *
 * Usage:
 * ```typescript
 * const aggregator = new MetricsAggregator();
 *
 * // After each test run
 * aggregator.recordTestRun({
 *   timestamp: new Date(),
 *   testSuite: 'e2e',
 *   totalTests: 12,
 *   passed: 12,
 *   avgSimilarity: 0.45,
 *   avgLatency: 2700,
 * });
 *
 * // Check for regressions
 * const alerts = aggregator.checkForRegressions();
 * ```
 */

import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger.js';

/**
 * Metrics Configuration Constants
 *
 * These constants define thresholds and limits for the metrics aggregator.
 * Extracting them makes the code more maintainable and self-documenting.
 *
 * Best Practice: Magic Numbers -> Named Constants (Clean Code, Chapter 17)
 * Reference: Martin Fowler's Refactoring - Replace Magic Number with Symbolic Constant
 */

// Default Alert Thresholds
const DEFAULT_SIMILARITY_DROP_THRESHOLD = 0.1;  // 10% drop triggers warning
const DEFAULT_LATENCY_INCREASE_THRESHOLD = 0.25;  // 25% increase triggers warning
const DEFAULT_PASS_RATE_DROP_THRESHOLD = 0.05;  // 5% drop triggers warning
const DEFAULT_MIN_TEST_RUNS = 3;  // Minimum runs needed for baseline

// Severity Thresholds
const CRITICAL_SIMILARITY_DROP_THRESHOLD = 0.2;  // 20% drop = critical
const CRITICAL_LATENCY_INCREASE_THRESHOLD = 0.5;  // 50% increase = critical
const CRITICAL_PASS_RATE_DROP_THRESHOLD = 0.1;  // 10% drop = critical

// Trend Calculation
const MIN_RUNS_FOR_TREND = 5;  // Minimum runs needed to calculate trend
const TREND_IMPROVEMENT_THRESHOLD = 0.05;  // 5% improvement
const TREND_DEGRADATION_THRESHOLD = -0.05;  // 5% degradation

// History Management
const MAX_HISTORY_RUNS = 100;  // Maximum runs to keep in history
const DEFAULT_BASELINE_RUNS = 10;  // Default number of runs for baseline
const DEFAULT_RECENT_RUNS = 10;  // Default number of recent runs to return

/**
 * Test Run Result
 */
export interface TestRunResult {
  timestamp: Date;
  testSuite: string;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number; // in milliseconds

  // Quality metrics
  avgSimilarity?: number;
  avgBleuScore?: number;

  // Performance metrics
  avgLatency?: number;
  p95Latency?: number;
  p99Latency?: number;
  avgTokens?: number;
  totalCost?: number;

  // Security metrics
  securityViolations?: number;
  avgRiskScore?: number;

  // Environment
  model?: string;
  version?: string;
  notes?: string;
}

/**
 * Aggregated Metrics
 */
export interface AggregatedMetrics {
  period: string; // e.g., "last_7_days", "last_30_days"
  testRuns: number;
  avgPassRate: number;
  avgSimilarity: number;
  avgLatency: number;
  trend: 'improving' | 'stable' | 'degrading';
}

/**
 * Regression Alert
 */
export interface RegressionAlert {
  severity: 'warning' | 'critical';
  metric: string;
  current: number;
  baseline: number;
  percentChange: number;
  message: string;
  timestamp: Date;
}

/**
 * Alert Thresholds
 */
export interface AlertThresholds {
  similarityDrop: number; // e.g., 0.1 = 10% drop triggers alert
  latencyIncrease: number; // e.g., 0.2 = 20% increase triggers alert
  passRateDrop: number; // e.g., 0.05 = 5% drop triggers alert
  minTestRuns: number; // minimum runs before alerting
}

export class MetricsAggregator {
  private dataDir: string;
  private historyFile: string;
  private thresholds: AlertThresholds;

  constructor(dataDir = './data/metrics') {
    this.dataDir = dataDir;
    this.historyFile = path.join(dataDir, 'test-history.json');

    // Default alert thresholds (using named constants for maintainability)
    this.thresholds = {
      similarityDrop: DEFAULT_SIMILARITY_DROP_THRESHOLD,
      latencyIncrease: DEFAULT_LATENCY_INCREASE_THRESHOLD,
      passRateDrop: DEFAULT_PASS_RATE_DROP_THRESHOLD,
      minTestRuns: DEFAULT_MIN_TEST_RUNS,
    };

    this.ensureDataDir();
  }

  /**
   * Ensure Data Directory Exists
   */
  private ensureDataDir(): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    if (!fs.existsSync(this.historyFile)) {
      fs.writeFileSync(this.historyFile, JSON.stringify([], null, 2));
    }
  }

  /**
   * Record Test Run Result
   *
   * Saves the result to history file for trend analysis.
   * Maintains a rolling history by keeping only the most recent runs.
   */
  recordTestRun(result: TestRunResult): void {
    const history = this.loadHistory();
    history.push(result);

    // Keep only the most recent runs to prevent unbounded growth
    if (history.length > MAX_HISTORY_RUNS) {
      history.splice(0, history.length - MAX_HISTORY_RUNS);
    }

    this.saveHistory(history);
  }

  /**
   * Load Test Run History
   */
  private loadHistory(): TestRunResult[] {
    try {
      const data = fs.readFileSync(this.historyFile, 'utf-8');
      const history = JSON.parse(data);

      // Validate that we have an array
      if (!Array.isArray(history)) {
        logger.warn('Test history file contains invalid data, resetting to empty array', {
          historyFile: this.historyFile,
        });
        return [];
      }

      // Convert timestamp strings back to Date objects with proper typing
      return history.map((r: Record<string, unknown>) => ({
        ...r,
        timestamp: new Date(r.timestamp as string),
      })) as TestRunResult[];
    } catch (error) {
      logger.warn('Failed to load test history', {
        historyFile: this.historyFile,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Save Test Run History
   */
  private saveHistory(history: TestRunResult[]): void {
    fs.writeFileSync(this.historyFile, JSON.stringify(history, null, 2));
  }

  /**
   * Get Recent Test Runs
   *
   * @param count - Number of recent runs to retrieve (default: 10)
   * @returns Recent test runs
   */
  getRecentRuns(count = DEFAULT_RECENT_RUNS): TestRunResult[] {
    const history = this.loadHistory();
    return history.slice(-count);
  }

  /**
   * Get Test Runs for Period
   *
   * @param days - Number of days to look back
   * @returns Test runs within period
   */
  getRunsForPeriod(days: number): TestRunResult[] {
    const history = this.loadHistory();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    return history.filter((r) => r.timestamp >= cutoff);
  }

  /**
   * Calculate Baseline Metrics
   *
   * Uses recent historical data to establish baseline for comparison.
   *
   * @param runs - Number of recent runs to use for baseline (default: 10)
   * @returns Baseline metrics or null if insufficient data
   */
  calculateBaseline(runs = DEFAULT_BASELINE_RUNS): AggregatedMetrics | null {
    const recentRuns = this.getRecentRuns(runs);

    if (recentRuns.length < this.thresholds.minTestRuns) {
      return null; // Not enough data
    }

    const totalTests = recentRuns.reduce((sum, r) => sum + r.totalTests, 0);
    const totalPassed = recentRuns.reduce((sum, r) => sum + r.passed, 0);

    const similarities = recentRuns
      .filter((r) => r.avgSimilarity !== undefined)
      .map((r) => r.avgSimilarity!);

    const latencies = recentRuns
      .filter((r) => r.avgLatency !== undefined)
      .map((r) => r.avgLatency!);

    return {
      period: `last_${runs}_runs`,
      testRuns: recentRuns.length,
      avgPassRate: totalPassed / totalTests,
      avgSimilarity: this.mean(similarities),
      avgLatency: this.mean(latencies),
      trend: this.calculateTrend(recentRuns),
    };
  }

  /**
   * Calculate Trend
   *
   * Determines if metrics are improving, stable, or degrading.
   * Compares first half vs second half of recent runs.
   */
  private calculateTrend(
    runs: TestRunResult[]
  ): 'improving' | 'stable' | 'degrading' {
    // Need minimum runs for meaningful trend analysis
    if (runs.length < MIN_RUNS_FOR_TREND) return 'stable';

    const firstHalf = runs.slice(0, Math.floor(runs.length / 2));
    const secondHalf = runs.slice(Math.floor(runs.length / 2));

    const firstAvgSim = this.mean(
      firstHalf.filter((r) => r.avgSimilarity).map((r) => r.avgSimilarity!)
    );
    const secondAvgSim = this.mean(
      secondHalf.filter((r) => r.avgSimilarity).map((r) => r.avgSimilarity!)
    );

    const change = secondAvgSim - firstAvgSim;

    if (change > TREND_IMPROVEMENT_THRESHOLD) return 'improving';
    if (change < TREND_DEGRADATION_THRESHOLD) return 'degrading';
    return 'stable';
  }

  /**
   * Check for Regressions
   *
   * Compares latest run against baseline to detect quality/performance regressions.
   *
   * @returns Array of regression alerts
   */
  checkForRegressions(): RegressionAlert[] {
    const alerts: RegressionAlert[] = [];
    const history = this.loadHistory();

    if (history.length < this.thresholds.minTestRuns + 1) {
      return []; // Not enough data
    }

    const latest = history[history.length - 1];
    const baseline = this.calculateBaseline(DEFAULT_BASELINE_RUNS);

    if (!baseline) return [];

    // Check similarity regression
    if (latest.avgSimilarity !== undefined) {
      const simChange =
        (latest.avgSimilarity - baseline.avgSimilarity) / baseline.avgSimilarity;

      if (simChange < -this.thresholds.similarityDrop) {
        alerts.push({
          severity: simChange <= -CRITICAL_SIMILARITY_DROP_THRESHOLD ? 'critical' : 'warning',
          metric: 'similarity',
          current: latest.avgSimilarity,
          baseline: baseline.avgSimilarity,
          percentChange: simChange * 100,
          message: `Similarity dropped ${Math.abs(simChange * 100).toFixed(1)}% (${latest.avgSimilarity.toFixed(2)} vs baseline ${baseline.avgSimilarity.toFixed(2)})`,
          timestamp: latest.timestamp,
        });
      }
    }

    // Check latency regression
    if (latest.avgLatency !== undefined) {
      const latencyChange =
        (latest.avgLatency - baseline.avgLatency) / baseline.avgLatency;

      if (latencyChange > this.thresholds.latencyIncrease) {
        alerts.push({
          severity: latencyChange >= CRITICAL_LATENCY_INCREASE_THRESHOLD ? 'critical' : 'warning',
          metric: 'latency',
          current: latest.avgLatency,
          baseline: baseline.avgLatency,
          percentChange: latencyChange * 100,
          message: `Latency increased ${(latencyChange * 100).toFixed(1)}% (${latest.avgLatency.toFixed(0)}ms vs baseline ${baseline.avgLatency.toFixed(0)}ms)`,
          timestamp: latest.timestamp,
        });
      }
    }

    // Check pass rate regression
    const currentPassRate = latest.passed / latest.totalTests;
    const passRateChange = currentPassRate - baseline.avgPassRate;

    if (passRateChange < -this.thresholds.passRateDrop) {
      alerts.push({
        severity: passRateChange < -CRITICAL_PASS_RATE_DROP_THRESHOLD ? 'critical' : 'warning',
        metric: 'pass_rate',
        current: currentPassRate,
        baseline: baseline.avgPassRate,
        percentChange: (passRateChange / baseline.avgPassRate) * 100,
        message: `Pass rate dropped ${Math.abs(passRateChange * 100).toFixed(1)}% (${(currentPassRate * 100).toFixed(1)}% vs baseline ${(baseline.avgPassRate * 100).toFixed(1)}%)`,
        timestamp: latest.timestamp,
      });
    }

    return alerts;
  }

  /**
   * Generate Dashboard Report
   *
   * Creates a summary of current system health and trends.
   */
  generateDashboard(): string {
    const baseline = this.calculateBaseline(DEFAULT_BASELINE_RUNS);
    const latest = this.getRecentRuns(1)[0];
    const alerts = this.checkForRegressions();

    if (!baseline || !latest) {
      return 'Insufficient data for dashboard (need at least 3 test runs)';
    }

    let report = `
Test Metrics Dashboard
======================

Latest Run: ${latest.timestamp.toISOString()}
Test Suite: ${latest.testSuite || 'unknown'}

Current Status:
  Tests: ${latest.passed}/${latest.totalTests} passed (${((latest.passed / latest.totalTests) * 100).toFixed(1)}%)
  Duration: ${(latest.duration / 1000).toFixed(1)}s
${latest.avgSimilarity ? `  Similarity: ${latest.avgSimilarity.toFixed(2)}` : ''}
${latest.avgLatency ? `  Latency: ${latest.avgLatency.toFixed(0)}ms` : ''}

Baseline (Last 10 Runs):
  Avg Pass Rate: ${(baseline.avgPassRate * 100).toFixed(1)}%
  Avg Similarity: ${baseline.avgSimilarity.toFixed(2)}
  Avg Latency: ${baseline.avgLatency.toFixed(0)}ms
  Trend: ${baseline.trend}

Alerts:
`;

    if (alerts.length === 0) {
      report += '  ✅ No regressions detected\n';
    } else {
      alerts.forEach((alert) => {
        const icon = alert.severity === 'critical' ? '🚨' : '⚠️';
        report += `  ${icon} ${alert.severity.toUpperCase()}: ${alert.message}\n`;
      });
    }

    return report.trim();
  }

  /**
   * Export Metrics for External Systems
   *
   * Exports in Prometheus-compatible format for integration with monitoring systems.
   */
  exportPrometheusMetrics(): string {
    const latest = this.getRecentRuns(1)[0];
    if (!latest) return '';

    const metrics: string[] = [];

    // Test metrics
    metrics.push(`# HELP llm_tests_total Total number of tests run`);
    metrics.push(`# TYPE llm_tests_total gauge`);
    metrics.push(`llm_tests_total{suite="${latest.testSuite}"} ${latest.totalTests}`);

    metrics.push(`# HELP llm_tests_passed Number of tests passed`);
    metrics.push(`# TYPE llm_tests_passed gauge`);
    metrics.push(`llm_tests_passed{suite="${latest.testSuite}"} ${latest.passed}`);

    // Quality metrics
    if (latest.avgSimilarity !== undefined) {
      metrics.push(`# HELP llm_similarity_score Average similarity score`);
      metrics.push(`# TYPE llm_similarity_score gauge`);
      metrics.push(`llm_similarity_score{suite="${latest.testSuite}"} ${latest.avgSimilarity}`);
    }

    // Performance metrics
    if (latest.avgLatency !== undefined) {
      metrics.push(`# HELP llm_latency_ms Average latency in milliseconds`);
      metrics.push(`# TYPE llm_latency_ms gauge`);
      metrics.push(`llm_latency_ms{suite="${latest.testSuite}"} ${latest.avgLatency}`);
    }

    return metrics.join('\n');
  }

  // Statistical helpers

  private mean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Set Custom Alert Thresholds
   */
  setThresholds(thresholds: Partial<AlertThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  /**
   * Clear All History
   *
   * Useful for testing or resetting metrics.
   */
  clearHistory(): void {
    this.saveHistory([]);
  }
}
