// Metrics aggregator for test results (trend analysis, regression detection, historical comparison)

import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger.js';

const DEFAULT_SIMILARITY_DROP_THRESHOLD = 0.1;
const DEFAULT_LATENCY_INCREASE_THRESHOLD = 0.25;
const DEFAULT_PASS_RATE_DROP_THRESHOLD = 0.05;
const DEFAULT_MIN_TEST_RUNS = 3;

const CRITICAL_SIMILARITY_DROP_THRESHOLD = 0.2;
const CRITICAL_LATENCY_INCREASE_THRESHOLD = 0.5;
const CRITICAL_PASS_RATE_DROP_THRESHOLD = 0.1;

const MIN_RUNS_FOR_TREND = 5;
const TREND_IMPROVEMENT_THRESHOLD = 0.05;
const TREND_DEGRADATION_THRESHOLD = -0.05;

const MAX_HISTORY_RUNS = 100;
const DEFAULT_BASELINE_RUNS = 10;
const DEFAULT_RECENT_RUNS = 10;

export interface TestRunResult {
  timestamp: Date;
  testSuite: string;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;

  avgSimilarity?: number;
  avgBleuScore?: number;

  avgLatency?: number;
  p95Latency?: number;
  p99Latency?: number;
  avgTokens?: number;
  totalCost?: number;

  securityViolations?: number;
  avgRiskScore?: number;

  model?: string;
  version?: string;
  notes?: string;
}

export interface AggregatedMetrics {
  period: string;
  testRuns: number;
  avgPassRate: number;
  avgSimilarity: number;
  avgLatency: number;
  trend: 'improving' | 'stable' | 'degrading';
}

export interface RegressionAlert {
  severity: 'warning' | 'critical';
  metric: string;
  current: number;
  baseline: number;
  percentChange: number;
  message: string;
  timestamp: Date;
}

export interface AlertThresholds {
  similarityDrop: number;
  latencyIncrease: number;
  passRateDrop: number;
  minTestRuns: number;
}

export class MetricsAggregator {
  private dataDir: string;
  private historyFile: string;
  private thresholds: AlertThresholds;

  constructor(dataDir = './data/metrics') {
    this.dataDir = dataDir;
    this.historyFile = path.join(dataDir, 'test-history.json');

    this.thresholds = {
      similarityDrop: DEFAULT_SIMILARITY_DROP_THRESHOLD,
      latencyIncrease: DEFAULT_LATENCY_INCREASE_THRESHOLD,
      passRateDrop: DEFAULT_PASS_RATE_DROP_THRESHOLD,
      minTestRuns: DEFAULT_MIN_TEST_RUNS,
    };

    this.ensureDataDir();
  }

  private ensureDataDir(): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    if (!fs.existsSync(this.historyFile)) {
      fs.writeFileSync(this.historyFile, JSON.stringify([], null, 2));
    }
  }

  recordTestRun(result: TestRunResult): void {
    const history = this.loadHistory();
    history.push(result);

    if (history.length > MAX_HISTORY_RUNS) {
      history.splice(0, history.length - MAX_HISTORY_RUNS);
    }

    this.saveHistory(history);
  }

  private loadHistory(): TestRunResult[] {
    try {
      const data = fs.readFileSync(this.historyFile, 'utf-8');
      const history = JSON.parse(data);

      if (!Array.isArray(history)) {
        logger.warn('Test history file contains invalid data, resetting to empty array', {
          historyFile: this.historyFile,
        });
        return [];
      }

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

  private saveHistory(history: TestRunResult[]): void {
    fs.writeFileSync(this.historyFile, JSON.stringify(history, null, 2));
  }

  getRecentRuns(count = DEFAULT_RECENT_RUNS): TestRunResult[] {
    const history = this.loadHistory();
    return history.slice(-count);
  }

  getRunsForPeriod(days: number): TestRunResult[] {
    const history = this.loadHistory();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    return history.filter((r) => r.timestamp >= cutoff);
  }

  calculateBaseline(runs = DEFAULT_BASELINE_RUNS): AggregatedMetrics | null {
    const recentRuns = this.getRecentRuns(runs);

    if (recentRuns.length < this.thresholds.minTestRuns) {
      return null;
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

  private calculateTrend(
    runs: TestRunResult[]
  ): 'improving' | 'stable' | 'degrading' {
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

  checkForRegressions(): RegressionAlert[] {
    const alerts: RegressionAlert[] = [];
    const history = this.loadHistory();

    if (history.length < this.thresholds.minTestRuns + 1) {
      return [];
    }

    const latest = history[history.length - 1];
    const baseline = this.calculateBaseline(DEFAULT_BASELINE_RUNS);

    if (!baseline) return [];

    if (latest.avgSimilarity !== undefined) {
      const simChange =
        baseline.avgSimilarity > 0
          ? (latest.avgSimilarity - baseline.avgSimilarity) / baseline.avgSimilarity
          : 0;

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

    if (latest.avgLatency !== undefined) {
      const latencyChange =
        baseline.avgLatency > 0
          ? (latest.avgLatency - baseline.avgLatency) / baseline.avgLatency
          : 0;

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

    const currentPassRate = latest.passed / latest.totalTests;
    const passRateChange = currentPassRate - baseline.avgPassRate;

    if (passRateChange < -this.thresholds.passRateDrop) {
      alerts.push({
        severity: passRateChange < -CRITICAL_PASS_RATE_DROP_THRESHOLD ? 'critical' : 'warning',
        metric: 'pass_rate',
        current: currentPassRate,
        baseline: baseline.avgPassRate,
        percentChange:
          baseline.avgPassRate > 0 ? (passRateChange / baseline.avgPassRate) * 100 : 0,
        message: `Pass rate dropped ${Math.abs(passRateChange * 100).toFixed(1)}% (${(currentPassRate * 100).toFixed(1)}% vs baseline ${(baseline.avgPassRate * 100).toFixed(1)}%)`,
        timestamp: latest.timestamp,
      });
    }

    return alerts;
  }

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

  exportPrometheusMetrics(): string {
    const latest = this.getRecentRuns(1)[0];
    if (!latest) return '';

    const metrics: string[] = [];

    metrics.push(`# HELP llm_tests_total Total number of tests run`);
    metrics.push(`# TYPE llm_tests_total gauge`);
    metrics.push(`llm_tests_total{suite="${latest.testSuite}"} ${latest.totalTests}`);

    metrics.push(`# HELP llm_tests_passed Number of tests passed`);
    metrics.push(`# TYPE llm_tests_passed gauge`);
    metrics.push(`llm_tests_passed{suite="${latest.testSuite}"} ${latest.passed}`);

    if (latest.avgSimilarity !== undefined) {
      metrics.push(`# HELP llm_similarity_score Average similarity score`);
      metrics.push(`# TYPE llm_similarity_score gauge`);
      metrics.push(`llm_similarity_score{suite="${latest.testSuite}"} ${latest.avgSimilarity}`);
    }

    if (latest.avgLatency !== undefined) {
      metrics.push(`# HELP llm_latency_ms Average latency in milliseconds`);
      metrics.push(`# TYPE llm_latency_ms gauge`);
      metrics.push(`llm_latency_ms{suite="${latest.testSuite}"} ${latest.avgLatency}`);
    }

    return metrics.join('\n');
  }

  private mean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  setThresholds(thresholds: Partial<AlertThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  clearHistory(): void {
    this.saveHistory([]);
  }
}
