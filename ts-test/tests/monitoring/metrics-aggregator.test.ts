/**
 * Metrics Aggregator Tests
 *
 * Tests the monitoring and observability system that tracks test results
 * over time, detects regressions, and generates alerts.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { MetricsAggregator, TestRunResult } from '../../src/monitoring/metrics-aggregator.js';
import fs from 'fs';
import path from 'path';

describe('Metrics Aggregator Tests', () => {
  let aggregator: MetricsAggregator;
  const testDataDir = './data/metrics-test';

  beforeEach(() => {
    aggregator = new MetricsAggregator(testDataDir);
    aggregator.clearHistory();
  });

  afterEach(() => {
    // Cleanup test data
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true });
    }
  });

  describe('Recording Test Runs', () => {
    it('should record a test run result', () => {
      const result: TestRunResult = {
        timestamp: new Date(),
        testSuite: 'unit',
        totalTests: 15,
        passed: 15,
        failed: 0,
        skipped: 0,
        duration: 500,
        avgSimilarity: 0.85,
        avgLatency: 100,
      };

      aggregator.recordTestRun(result);

      const recent = aggregator.getRecentRuns(1);
      expect(recent).toHaveLength(1);
      expect(recent[0].testSuite).toBe('unit');
      expect(recent[0].passed).toBe(15);
    });

    it('should store multiple test runs', () => {
      for (let i = 0; i < 5; i++) {
        aggregator.recordTestRun({
          timestamp: new Date(),
          testSuite: 'e2e',
          totalTests: 12,
          passed: 12,
          failed: 0,
          skipped: 0,
          duration: 15000,
          avgSimilarity: 0.45,
        });
      }

      const recent = aggregator.getRecentRuns(10);
      expect(recent).toHaveLength(5);
    });

    it('should limit history to last 100 runs', () => {
      for (let i = 0; i < 150; i++) {
        aggregator.recordTestRun({
          timestamp: new Date(),
          testSuite: 'test',
          totalTests: 10,
          passed: 10,
          failed: 0,
          skipped: 0,
          duration: 1000,
        });
      }

      const recent = aggregator.getRecentRuns(150);
      expect(recent).toHaveLength(100); // Capped at 100
    });
  });

  describe('Baseline Calculation', () => {
    it('should calculate baseline from recent runs', () => {
      // Add 10 test runs with consistent metrics
      for (let i = 0; i < 10; i++) {
        aggregator.recordTestRun({
          timestamp: new Date(),
          testSuite: 'e2e',
          totalTests: 12,
          passed: 12,
          failed: 0,
          skipped: 0,
          duration: 15000,
          avgSimilarity: 0.45,
          avgLatency: 2700,
        });
      }

      const baseline = aggregator.calculateBaseline(10);

      expect(baseline).not.toBeNull();
      expect(baseline!.avgPassRate).toBe(1.0);
      expect(baseline!.avgSimilarity).toBeCloseTo(0.45, 2);
      expect(baseline!.avgLatency).toBe(2700);
    });

    it('should return null when insufficient data', () => {
      // Only 2 runs (need at least 3)
      aggregator.recordTestRun({
        timestamp: new Date(),
        testSuite: 'test',
        totalTests: 10,
        passed: 10,
        failed: 0,
        skipped: 0,
        duration: 1000,
      });

      aggregator.recordTestRun({
        timestamp: new Date(),
        testSuite: 'test',
        totalTests: 10,
        passed: 10,
        failed: 0,
        skipped: 0,
        duration: 1000,
      });

      const baseline = aggregator.calculateBaseline(10);
      expect(baseline).toBeNull();
    });

    it('should detect improving trend', () => {
      // First 5 runs with lower similarity
      for (let i = 0; i < 5; i++) {
        aggregator.recordTestRun({
          timestamp: new Date(),
          testSuite: 'test',
          totalTests: 10,
          passed: 10,
          failed: 0,
          skipped: 0,
          duration: 1000,
          avgSimilarity: 0.4,
        });
      }

      // Next 5 runs with higher similarity
      for (let i = 0; i < 5; i++) {
        aggregator.recordTestRun({
          timestamp: new Date(),
          testSuite: 'test',
          totalTests: 10,
          passed: 10,
          failed: 0,
          skipped: 0,
          duration: 1000,
          avgSimilarity: 0.5,
        });
      }

      const baseline = aggregator.calculateBaseline(10);
      expect(baseline!.trend).toBe('improving');
    });

    it('should detect degrading trend', () => {
      // First 5 runs with higher similarity
      for (let i = 0; i < 5; i++) {
        aggregator.recordTestRun({
          timestamp: new Date(),
          testSuite: 'test',
          totalTests: 10,
          passed: 10,
          failed: 0,
          skipped: 0,
          duration: 1000,
          avgSimilarity: 0.5,
        });
      }

      // Next 5 runs with lower similarity
      for (let i = 0; i < 5; i++) {
        aggregator.recordTestRun({
          timestamp: new Date(),
          testSuite: 'test',
          totalTests: 10,
          passed: 10,
          failed: 0,
          skipped: 0,
          duration: 1000,
          avgSimilarity: 0.4,
        });
      }

      const baseline = aggregator.calculateBaseline(10);
      expect(baseline!.trend).toBe('degrading');
    });
  });

  describe('Regression Detection', () => {
    it('should detect similarity regression', () => {
      // Establish baseline with good similarity
      for (let i = 0; i < 10; i++) {
        aggregator.recordTestRun({
          timestamp: new Date(),
          testSuite: 'test',
          totalTests: 10,
          passed: 10,
          failed: 0,
          skipped: 0,
          duration: 1000,
          avgSimilarity: 0.5,
        });
      }

      // Add a run with significantly lower similarity
      aggregator.recordTestRun({
        timestamp: new Date(),
        testSuite: 'test',
        totalTests: 10,
        passed: 10,
        failed: 0,
        skipped: 0,
        duration: 1000,
        avgSimilarity: 0.35, // Large drop to trigger critical alert
      });

      const alerts = aggregator.checkForRegressions();

      expect(alerts.length).toBeGreaterThan(0);
      const simAlert = alerts.find((a) => a.metric === 'similarity');
      expect(simAlert).toBeDefined();
      expect(simAlert!.severity).toBe('critical'); // >20% drop
    });

    it('should detect latency regression', () => {
      // Establish baseline
      for (let i = 0; i < 10; i++) {
        aggregator.recordTestRun({
          timestamp: new Date(),
          testSuite: 'test',
          totalTests: 10,
          passed: 10,
          failed: 0,
          skipped: 0,
          duration: 1000,
          avgLatency: 2000,
        });
      }

      // Add a run with significantly higher latency
      aggregator.recordTestRun({
        timestamp: new Date(),
        testSuite: 'test',
        totalTests: 10,
        passed: 10,
        failed: 0,
        skipped: 0,
        duration: 1000,
        avgLatency: 3500, // Large increase to trigger critical alert
      });

      const alerts = aggregator.checkForRegressions();

      expect(alerts.length).toBeGreaterThan(0);
      const latencyAlert = alerts.find((a) => a.metric === 'latency');
      expect(latencyAlert).toBeDefined();
      expect(latencyAlert!.severity).toBe('critical'); // >50% increase
    });

    it('should detect pass rate regression', () => {
      // Establish baseline with 100% pass rate
      for (let i = 0; i < 10; i++) {
        aggregator.recordTestRun({
          timestamp: new Date(),
          testSuite: 'test',
          totalTests: 10,
          passed: 10,
          failed: 0,
          skipped: 0,
          duration: 1000,
        });
      }

      // Add a run with lower pass rate
      aggregator.recordTestRun({
        timestamp: new Date(),
        testSuite: 'test',
        totalTests: 10,
        passed: 8,
        failed: 2,
        skipped: 0,
        duration: 1000,
      });

      const alerts = aggregator.checkForRegressions();

      expect(alerts.length).toBeGreaterThan(0);
      const passRateAlert = alerts.find((a) => a.metric === 'pass_rate');
      expect(passRateAlert).toBeDefined();
      expect(passRateAlert!.current).toBe(0.8); // 80%
    });

    it('should not alert on minor fluctuations', () => {
      // Establish baseline
      for (let i = 0; i < 10; i++) {
        aggregator.recordTestRun({
          timestamp: new Date(),
          testSuite: 'test',
          totalTests: 10,
          passed: 10,
          failed: 0,
          skipped: 0,
          duration: 1000,
          avgSimilarity: 0.5,
          avgLatency: 2000,
        });
      }

      // Add a run with small changes (within threshold)
      aggregator.recordTestRun({
        timestamp: new Date(),
        testSuite: 'test',
        totalTests: 10,
        passed: 10,
        failed: 0,
        skipped: 0,
        duration: 1000,
        avgSimilarity: 0.48, // 4% drop (threshold is 10%)
        avgLatency: 2200, // 10% increase (threshold is 25%)
      });

      const alerts = aggregator.checkForRegressions();
      expect(alerts).toHaveLength(0); // No alerts for minor changes
    });
  });

  describe('Dashboard Generation', () => {
    it('should generate dashboard with current metrics', () => {
      // Add test runs
      for (let i = 0; i < 5; i++) {
        aggregator.recordTestRun({
          timestamp: new Date(),
          testSuite: 'e2e',
          totalTests: 12,
          passed: 12,
          failed: 0,
          skipped: 0,
          duration: 15000,
          avgSimilarity: 0.45,
          avgLatency: 2700,
        });
      }

      const dashboard = aggregator.generateDashboard();

      expect(dashboard).toContain('Test Metrics Dashboard');
      expect(dashboard).toContain('Current Status');
      expect(dashboard).toContain('Baseline');
      expect(dashboard).toContain('Alerts');
      expect(dashboard).toContain('No regressions detected');
    });

    it('should show alerts in dashboard', () => {
      // Baseline
      for (let i = 0; i < 10; i++) {
        aggregator.recordTestRun({
          timestamp: new Date(),
          testSuite: 'test',
          totalTests: 10,
          passed: 10,
          failed: 0,
          skipped: 0,
          duration: 1000,
          avgSimilarity: 0.5,
        });
      }

      // Regression
      aggregator.recordTestRun({
        timestamp: new Date(),
        testSuite: 'test',
        totalTests: 10,
        passed: 10,
        failed: 0,
        skipped: 0,
        duration: 1000,
        avgSimilarity: 0.35, // Large drop to trigger critical alert
      });

      const dashboard = aggregator.generateDashboard();

      expect(dashboard).toContain('🚨 CRITICAL');
      expect(dashboard).toContain('Similarity dropped');
    });
  });

  describe('Prometheus Metrics Export', () => {
    it('should export metrics in Prometheus format', () => {
      aggregator.recordTestRun({
        timestamp: new Date(),
        testSuite: 'e2e',
        totalTests: 12,
        passed: 12,
        failed: 0,
        skipped: 0,
        duration: 15000,
        avgSimilarity: 0.45,
        avgLatency: 2700,
      });

      const prometheusMetrics = aggregator.exportPrometheusMetrics();

      expect(prometheusMetrics).toContain('llm_tests_total');
      expect(prometheusMetrics).toContain('llm_tests_passed');
      expect(prometheusMetrics).toContain('llm_similarity_score');
      expect(prometheusMetrics).toContain('llm_latency_ms');
      expect(prometheusMetrics).toContain('suite="e2e"');
    });
  });

  describe('Time-Based Queries', () => {
    it('should get runs for a specific time period', () => {
      const now = new Date();

      // Add runs from different time periods
      for (let i = 0; i < 5; i++) {
        const timestamp = new Date(now);
        timestamp.setDate(timestamp.getDate() - i);

        aggregator.recordTestRun({
          timestamp,
          testSuite: 'test',
          totalTests: 10,
          passed: 10,
          failed: 0,
          skipped: 0,
          duration: 1000,
        });
      }

      const last3Days = aggregator.getRunsForPeriod(3);
      expect(last3Days.length).toBeGreaterThan(0);
      expect(last3Days.length).toBeLessThanOrEqual(4); // 0, 1, 2, 3 days ago
    });
  });

  describe('Custom Thresholds', () => {
    it('should allow custom alert thresholds', () => {
      // Set very strict thresholds
      aggregator.setThresholds({
        similarityDrop: 0.05, // 5% drop triggers alert
        latencyIncrease: 0.1, // 10% increase triggers alert
      });

      // Baseline
      for (let i = 0; i < 10; i++) {
        aggregator.recordTestRun({
          timestamp: new Date(),
          testSuite: 'test',
          totalTests: 10,
          passed: 10,
          failed: 0,
          skipped: 0,
          duration: 1000,
          avgSimilarity: 0.5,
          avgLatency: 2000,
        });
      }

      // Small change that triggers with strict threshold
      aggregator.recordTestRun({
        timestamp: new Date(),
        testSuite: 'test',
        totalTests: 10,
        passed: 10,
        failed: 0,
        skipped: 0,
        duration: 1000,
        avgSimilarity: 0.47, // 6% drop (triggers 5% threshold)
      });

      const alerts = aggregator.checkForRegressions();
      expect(alerts.length).toBeGreaterThan(0);
    });
  });
});
