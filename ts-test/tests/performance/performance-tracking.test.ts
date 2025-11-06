/**
 * Performance Tracking Tests
 *
 * Tests the performance metrics collection and analysis system.
 * These tests validate that we can accurately track:
 * - Latency measurements
 * - Token usage and cost calculation
 * - Throughput metrics
 * - Statistical analysis (percentiles, mean, std dev)
 * - SLO (Service Level Objective) compliance
 *
 * Why Performance Testing for LLMs?
 * - LLMs have variable response times (depends on output length)
 * - Token-based pricing requires cost tracking
 * - Production systems need SLO monitoring
 * - Performance regression detection is critical
 *
 * Test Coverage:
 * - Basic metric recording (5 tests)
 * - Latency tracking and statistics (4 tests)
 * - Token usage and cost calculation (4 tests)
 * - Report generation (3 tests)
 * - SLO compliance checking (4 tests)
 * - Edge cases (4 tests)
 * - Filtering and queries (3 tests)
 *
 * Total: 27 tests
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  PerformanceCollector,
  MODEL_PRICING,
  PerformanceMetric,
  PerformanceSLO,
} from '../../src/performance/performance-collector.js';

describe('Performance Tracking Tests', () => {
  let collector: PerformanceCollector;

  beforeEach(() => {
    collector = new PerformanceCollector();
  });

  describe('Basic Metric Recording', () => {
    /**
     * Test: Start and End Request
     *
     * Validates basic request tracking lifecycle:
     * 1. Start request (records start time)
     * 2. Simulate work (delay)
     * 3. End request (calculates latency)
     */
    it('should track request start and end times', async () => {
      const request = collector.startRequest();

      // Simulate work
      await new Promise((resolve) => setTimeout(resolve, 100));

      request.end({
        inputTokens: 50,
        outputTokens: 25,
        model: 'llama3.1:8b',
      });

      const metrics = collector.getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0].latency).toBeGreaterThanOrEqual(100);
      expect(metrics[0].latency).toBeLessThan(200); // Allow some variance
      expect(metrics[0].success).toBe(true);
    });

    it('should assign unique request IDs', () => {
      const req1 = collector.startRequest();
      const req2 = collector.startRequest();
      const req3 = collector.startRequest();

      req1.end();
      req2.end();
      req3.end();

      const metrics = collector.getMetrics();
      const ids = metrics.map((m) => m.requestId);

      expect(new Set(ids).size).toBe(3); // All unique
      expect(ids[0]).not.toBe(ids[1]);
      expect(ids[1]).not.toBe(ids[2]);
    });

    it('should record successful requests', () => {
      const request = collector.startRequest();
      request.end({
        inputTokens: 100,
        outputTokens: 50,
        model: 'llama3.1:8b',
      });

      const metrics = collector.getMetrics();
      expect(metrics[0].success).toBe(true);
      expect(metrics[0].error).toBeUndefined();
    });

    it('should record failed requests with error messages', () => {
      const request = collector.startRequest();
      request.end(undefined, 'Connection timeout');

      const metrics = collector.getMetrics();
      expect(metrics[0].success).toBe(false);
      expect(metrics[0].error).toBe('Connection timeout');
    });

    it('should manually record complete metrics', () => {
      const metric: PerformanceMetric = {
        requestId: 'manual_1',
        startTime: Date.now() - 1000,
        endTime: Date.now(),
        latency: 1000,
        inputTokens: 75,
        outputTokens: 40,
        totalTokens: 115,
        model: 'llama3.1:8b',
        cost: 0,
        success: true,
      };

      collector.recordMetric(metric);

      const metrics = collector.getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0].requestId).toBe('manual_1');
      expect(metrics[0].latency).toBe(1000);
    });
  });

  describe('Latency Tracking and Statistics', () => {
    it('should calculate mean latency correctly', () => {
      // Record requests with known latencies
      const latencies = [100, 200, 300, 400, 500];

      latencies.forEach((latency) => {
        collector.recordMetric({
          requestId: `req_${latency}`,
          startTime: Date.now() - latency,
          endTime: Date.now(),
          latency,
          success: true,
        });
      });

      const report = collector.generateReport();
      expect(report.meanLatency).toBe(300); // (100+200+300+400+500)/5
    });

    it('should calculate percentiles correctly', () => {
      // 100 requests with latencies from 100ms to 1000ms
      for (let i = 1; i <= 100; i++) {
        const latency = i * 10;
        collector.recordMetric({
          requestId: `req_${i}`,
          startTime: Date.now() - latency,
          endTime: Date.now(),
          latency,
          success: true,
        });
      }

      const report = collector.generateReport();

      // P50 (median) should be around 500ms
      expect(report.medianLatency).toBeGreaterThanOrEqual(500);
      expect(report.medianLatency).toBeLessThanOrEqual(510);

      // P95 should be around 950ms
      expect(report.p95Latency).toBeGreaterThanOrEqual(950);
      expect(report.p95Latency).toBeLessThanOrEqual(960);

      // P99 should be around 990ms
      expect(report.p99Latency).toBeGreaterThanOrEqual(990);
      expect(report.p99Latency).toBeLessThanOrEqual(1000);
    });

    it('should track min and max latency', () => {
      const latencies = [50, 1500, 200, 3000, 100];

      latencies.forEach((latency) => {
        collector.recordMetric({
          requestId: `req_${latency}`,
          startTime: Date.now() - latency,
          endTime: Date.now(),
          latency,
          success: true,
        });
      });

      const report = collector.generateReport();
      expect(report.minLatency).toBe(50);
      expect(report.maxLatency).toBe(3000);
    });

    it('should calculate standard deviation', () => {
      // All same latency should have 0 std dev
      for (let i = 0; i < 10; i++) {
        collector.recordMetric({
          requestId: `req_${i}`,
          startTime: Date.now() - 500,
          endTime: Date.now(),
          latency: 500,
          success: true,
        });
      }

      const report = collector.generateReport();
      expect(report.stdDeviation).toBe(0);
    });
  });

  describe('Token Usage and Cost Calculation', () => {
    it('should track token usage correctly', () => {
      const request = collector.startRequest();
      request.end({
        inputTokens: 150,
        outputTokens: 75,
        model: 'llama3.1:8b',
      });

      const metrics = collector.getMetrics();
      expect(metrics[0].inputTokens).toBe(150);
      expect(metrics[0].outputTokens).toBe(75);
      expect(metrics[0].totalTokens).toBe(225);
    });

    it('should calculate cost for local models (free)', () => {
      const request = collector.startRequest();
      request.end({
        inputTokens: 1000,
        outputTokens: 500,
        model: 'llama3.1:8b',
      });

      const metrics = collector.getMetrics();
      expect(metrics[0].cost).toBe(0); // Local models are free
    });

    it('should calculate cost for commercial models', () => {
      // Simulate GPT-4 usage (for testing cost calculation logic)
      const request = collector.startRequest();
      request.end({
        inputTokens: 1_000_000,  // 1M input tokens
        outputTokens: 500_000,   // 500k output tokens
        model: 'gpt-4',
      });

      const metrics = collector.getMetrics();
      const pricing = MODEL_PRICING['gpt-4'];

      // Expected: (1M * $30/1M) + (500k * $60/1M) = $30 + $30 = $60
      const expectedCost = (1_000_000 / 1_000_000) * pricing.input +
                          (500_000 / 1_000_000) * pricing.output;

      expect(metrics[0].cost).toBeCloseTo(expectedCost, 2);
    });

    it('should aggregate token usage across multiple requests', () => {
      for (let i = 0; i < 5; i++) {
        const request = collector.startRequest();
        request.end({
          inputTokens: 100,
          outputTokens: 50,
          model: 'llama3.1:8b',
        });
      }

      const report = collector.generateReport();
      expect(report.totalInputTokens).toBe(500);
      expect(report.totalOutputTokens).toBe(250);
      expect(report.totalTokens).toBe(750);
      expect(report.meanInputTokens).toBe(100);
      expect(report.meanOutputTokens).toBe(50);
    });
  });

  describe('Report Generation', () => {
    it('should generate comprehensive performance report', () => {
      // Add multiple requests with varying metrics
      for (let i = 1; i <= 10; i++) {
        collector.recordMetric({
          requestId: `req_${i}`,
          startTime: Date.now() - (i * 100),
          endTime: Date.now(),
          latency: i * 100,
          inputTokens: 50 * i,
          outputTokens: 25 * i,
          totalTokens: 75 * i,
          model: 'llama3.1:8b',
          cost: 0,
          success: true,
        });
      }

      const report = collector.generateReport();

      expect(report.totalRequests).toBe(10);
      expect(report.successfulRequests).toBe(10);
      expect(report.failedRequests).toBe(0);
      expect(report.errorRate).toBe(0);

      expect(report.meanLatency).toBe(550); // (100+200+...+1000)/10
      expect(report.totalInputTokens).toBe(2750); // 50+100+...+500
      expect(report.totalOutputTokens).toBe(1375); // 25+50+...+250
      expect(report.totalCost).toBe(0); // Local model
    });

    it('should generate formatted text report', () => {
      const request = collector.startRequest();
      request.end({
        inputTokens: 100,
        outputTokens: 50,
        model: 'llama3.1:8b',
      });

      const reportText = collector.generateReportText();

      expect(reportText).toContain('Performance Report');
      expect(reportText).toContain('Total: 1');
      expect(reportText).toContain('Successful: 1');
      expect(reportText).toContain('Latency (ms)');
      expect(reportText).toContain('Tokens:');
      expect(reportText).toContain('Cost:');
      expect(reportText).toContain('Throughput:');
    });

    it('should calculate throughput metrics', () => {
      // Simulate 10 requests over 5 seconds
      const startTime = Date.now() - 5000;

      for (let i = 0; i < 10; i++) {
        collector.recordMetric({
          requestId: `req_${i}`,
          startTime: startTime + (i * 500), // 500ms apart
          endTime: startTime + (i * 500) + 100,
          latency: 100,
          inputTokens: 50,
          outputTokens: 25,
          totalTokens: 75,
          model: 'llama3.1:8b',
          cost: 0,
          success: true,
        });
      }

      const report = collector.generateReport();

      // 10 requests over ~4.5 seconds = ~2.2 req/s
      expect(report.requestsPerSecond).toBeGreaterThan(2.0);
      expect(report.requestsPerSecond).toBeLessThan(2.5);

      // 750 total tokens over ~4.5 seconds = ~166 tokens/s
      expect(report.tokensPerSecond).toBeGreaterThan(150);
      expect(report.tokensPerSecond).toBeLessThan(200);
    });
  });

  describe('SLO Compliance Checking', () => {
    it('should pass SLO when metrics meet thresholds', () => {
      // Add requests that meet SLO
      for (let i = 0; i < 100; i++) {
        collector.recordMetric({
          requestId: `req_${i}`,
          startTime: Date.now() - 100,
          endTime: Date.now(),
          latency: 100 + Math.random() * 100, // 100-200ms
          inputTokens: 50,
          outputTokens: 25,
          model: 'llama3.1:8b',
          cost: 0,
          success: true,
        });
      }

      const slo: PerformanceSLO = {
        maxP95Latency: 500,
        maxP99Latency: 1000,
        maxErrorRate: 0.01,
      };

      const result = collector.checkSLO(slo);
      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should fail SLO when P95 latency exceeds threshold', () => {
      // Add requests with high latencies
      for (let i = 0; i < 100; i++) {
        collector.recordMetric({
          requestId: `req_${i}`,
          startTime: Date.now() - 3000,
          endTime: Date.now(),
          latency: 3000, // High latency
          success: true,
        });
      }

      const slo: PerformanceSLO = {
        maxP95Latency: 2000,
        maxP99Latency: 5000,
        maxErrorRate: 0.01,
      };

      const result = collector.checkSLO(slo);
      expect(result.passed).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0]).toContain('P95 latency');
      expect(result.violations[0]).toContain('exceeds SLO');
    });

    it('should fail SLO when error rate exceeds threshold', () => {
      // Add 95 successful and 5 failed requests (5% error rate)
      for (let i = 0; i < 95; i++) {
        collector.recordMetric({
          requestId: `success_${i}`,
          startTime: Date.now() - 100,
          endTime: Date.now(),
          latency: 100,
          success: true,
        });
      }

      for (let i = 0; i < 5; i++) {
        collector.recordMetric({
          requestId: `fail_${i}`,
          startTime: Date.now() - 100,
          endTime: Date.now(),
          latency: 100,
          success: false,
          error: 'Timeout',
        });
      }

      const slo: PerformanceSLO = {
        maxP95Latency: 1000,
        maxP99Latency: 2000,
        maxErrorRate: 0.01, // 1% max error rate
      };

      const result = collector.checkSLO(slo);
      expect(result.passed).toBe(false);
      expect(result.violations.some((v) => v.includes('Error rate'))).toBe(true);
    });

    it('should check throughput SLO if specified', () => {
      // Add 5 requests over 10 seconds (0.5 req/s)
      const startTime = Date.now() - 10000;

      for (let i = 0; i < 5; i++) {
        collector.recordMetric({
          requestId: `req_${i}`,
          startTime: startTime + (i * 2000),
          endTime: startTime + (i * 2000) + 100,
          latency: 100,
          success: true,
        });
      }

      const slo: PerformanceSLO = {
        maxP95Latency: 1000,
        maxP99Latency: 2000,
        maxErrorRate: 0.05,
        minThroughput: 1.0, // Require at least 1 req/s
      };

      const result = collector.checkSLO(slo);
      expect(result.passed).toBe(false);
      expect(result.violations.some((v) => v.includes('Throughput'))).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle single request', () => {
      const request = collector.startRequest();
      request.end({
        inputTokens: 50,
        outputTokens: 25,
        model: 'llama3.1:8b',
      });

      const report = collector.generateReport();
      expect(report.totalRequests).toBe(1);
      expect(report.meanLatency).toBe(report.medianLatency);
      expect(report.stdDeviation).toBe(0);
    });

    it('should throw error when generating report with no metrics', () => {
      expect(() => {
        collector.generateReport();
      }).toThrow('No metrics recorded');
    });

    it('should handle requests without token usage', () => {
      const request = collector.startRequest();
      request.end(); // No usage info

      const metrics = collector.getMetrics();
      expect(metrics[0].inputTokens).toBeUndefined();
      expect(metrics[0].outputTokens).toBeUndefined();
      expect(metrics[0].cost).toBeUndefined();
    });

    it('should clear all metrics', () => {
      const req1 = collector.startRequest();
      const req2 = collector.startRequest();
      req1.end();
      req2.end();

      expect(collector.getMetrics()).toHaveLength(2);

      collector.clear();

      expect(collector.getMetrics()).toHaveLength(0);
    });
  });

  describe('Filtering and Queries', () => {
    it('should filter metrics by success status', () => {
      // Add 3 successful and 2 failed
      for (let i = 0; i < 3; i++) {
        const req = collector.startRequest();
        req.end({ inputTokens: 50, outputTokens: 25, model: 'llama3.1:8b' });
      }

      for (let i = 0; i < 2; i++) {
        const req = collector.startRequest();
        req.end(undefined, 'Error');
      }

      const successful = collector.getMetricsByStatus(true);
      const failed = collector.getMetricsByStatus(false);

      expect(successful).toHaveLength(3);
      expect(failed).toHaveLength(2);
    });

    it('should filter metrics by model', () => {
      const req1 = collector.startRequest();
      req1.end({ inputTokens: 50, outputTokens: 25, model: 'llama3.1:8b' });

      const req2 = collector.startRequest();
      req2.end({ inputTokens: 50, outputTokens: 25, model: 'llama3.2:latest' });

      const req3 = collector.startRequest();
      req3.end({ inputTokens: 50, outputTokens: 25, model: 'llama3.1:8b' });

      const llama31Metrics = collector.getMetricsByModel('llama3.1:8b');
      const llama32Metrics = collector.getMetricsByModel('llama3.2:latest');

      expect(llama31Metrics).toHaveLength(2);
      expect(llama32Metrics).toHaveLength(1);
    });

    it('should get all metrics', () => {
      for (let i = 0; i < 5; i++) {
        const req = collector.startRequest();
        req.end();
      }

      const allMetrics = collector.getMetrics();
      expect(allMetrics).toHaveLength(5);

      // Should return a copy (not affect internal state)
      allMetrics.pop();
      expect(collector.getMetrics()).toHaveLength(5);
    });
  });
});
