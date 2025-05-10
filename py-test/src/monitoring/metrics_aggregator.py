"""
Metrics Aggregator for Test Results

Collects and aggregates test results over time to enable:
- Trend analysis (quality/performance over time)
- Regression detection (degradation alerts)
- Historical comparison (before/after model changes)
- Dashboard reporting (current system health)

Why Monitoring for LLM Testing?
- Detect quality regressions when models are updated
- Track performance trends (latency increases over time)
- Alert on SLO violations
- Measure impact of prompt engineering changes
- Compare A/B test results

Usage:
```python
aggregator = MetricsAggregator()

# After each test run
aggregator.record_test_run({
    'timestamp': datetime.now(),
    'test_suite': 'e2e',
    'total_tests': 12,
    'passed': 12,
    'avg_similarity': 0.45,
    'avg_latency': 2700,
})

# Check for regressions
alerts = aggregator.check_for_regressions()
```
"""

import json
import os
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import Literal, Optional

from ..utils.logger import logger

# Default Alert Thresholds
DEFAULT_SIMILARITY_DROP_THRESHOLD = 0.1  # 10% drop triggers warning
DEFAULT_LATENCY_INCREASE_THRESHOLD = 0.25  # 25% increase triggers warning
DEFAULT_PASS_RATE_DROP_THRESHOLD = 0.05  # 5% drop triggers warning
DEFAULT_MIN_TEST_RUNS = 3  # Minimum runs needed for baseline

# Severity Thresholds
CRITICAL_SIMILARITY_DROP_THRESHOLD = 0.2  # 20% drop = critical
CRITICAL_LATENCY_INCREASE_THRESHOLD = 0.5  # 50% increase = critical
CRITICAL_PASS_RATE_DROP_THRESHOLD = 0.1  # 10% drop = critical

# Trend Calculation
MIN_RUNS_FOR_TREND = 5  # Minimum runs needed to calculate trend
TREND_IMPROVEMENT_THRESHOLD = 0.05  # 5% improvement
TREND_DEGRADATION_THRESHOLD = -0.05  # 5% degradation

# History Management
MAX_HISTORY_RUNS = 100  # Maximum runs to keep in history
DEFAULT_BASELINE_RUNS = 10  # Default number of runs for baseline
DEFAULT_RECENT_RUNS = 10  # Default number of recent runs to return


@dataclass
class TestRunResult:
    """Test run result"""
    timestamp: datetime
    test_suite: str
    total_tests: int
    passed: int
    failed: int
    skipped: int
    duration: float  # in milliseconds

    # Quality metrics
    avg_similarity: Optional[float] = None
    avg_bleu_score: Optional[float] = None

    # Performance metrics
    avg_latency: Optional[float] = None
    p95_latency: Optional[float] = None
    p99_latency: Optional[float] = None
    avg_tokens: Optional[float] = None
    total_cost: Optional[float] = None

    # Security metrics
    security_violations: Optional[int] = None
    avg_risk_score: Optional[float] = None

    # Environment
    model: Optional[str] = None
    version: Optional[str] = None
    notes: Optional[str] = None


@dataclass
class AggregatedMetrics:
    """Aggregated metrics"""
    period: str  # e.g., "last_7_days", "last_30_days"
    test_runs: int
    avg_pass_rate: float
    avg_similarity: float
    avg_latency: float
    trend: Literal['improving', 'stable', 'degrading']


@dataclass
class RegressionAlert:
    """Regression alert"""
    severity: Literal['warning', 'critical']
    metric: str
    current: float
    baseline: float
    percent_change: float
    message: str
    timestamp: datetime


@dataclass
class AlertThresholds:
    """Alert thresholds"""
    similarity_drop: float  # e.g., 0.1 = 10% drop triggers alert
    latency_increase: float  # e.g., 0.2 = 20% increase triggers alert
    pass_rate_drop: float  # e.g., 0.05 = 5% drop triggers alert
    min_test_runs: int  # minimum runs before alerting


class MetricsAggregator:
    """Metrics Aggregator"""

    def __init__(self, data_dir: str = './data/metrics'):
        self.data_dir = data_dir
        self.history_file = os.path.join(data_dir, 'test-history.json')

        # Default alert thresholds (using named constants for maintainability)
        self.thresholds = AlertThresholds(
            similarity_drop=DEFAULT_SIMILARITY_DROP_THRESHOLD,
            latency_increase=DEFAULT_LATENCY_INCREASE_THRESHOLD,
            pass_rate_drop=DEFAULT_PASS_RATE_DROP_THRESHOLD,
            min_test_runs=DEFAULT_MIN_TEST_RUNS
        )

        self._ensure_data_dir()

    def _ensure_data_dir(self) -> None:
        """Ensure data directory exists"""
        Path(self.data_dir).mkdir(parents=True, exist_ok=True)

        if not os.path.exists(self.history_file):
            with open(self.history_file, 'w') as f:
                json.dump([], f, indent=2)

    def record_test_run(self, result: TestRunResult) -> None:
        """
        Record Test Run Result

        Saves the result to history file for trend analysis.
        Maintains a rolling history by keeping only the most recent runs.

        Args:
            result: Test run result to record
        """
        history = self._load_history()
        history.append(result)

        # Keep only the most recent runs to prevent unbounded growth
        if len(history) > MAX_HISTORY_RUNS:
            history = history[-MAX_HISTORY_RUNS:]

        self._save_history(history)

    def _load_history(self) -> list[TestRunResult]:
        """Load test run history"""
        try:
            with open(self.history_file) as f:
                data = json.load(f)

            # Validate that we have an array
            if not isinstance(data, list):
                logger.warn(
                    'Test history file contains invalid data, resetting to empty array',
                    {'history_file': self.history_file}
                )
                return []

            # Convert timestamp strings back to datetime objects
            return [
                TestRunResult(
                    **{
                        **item,
                        'timestamp': datetime.fromisoformat(
                            item['timestamp'].replace('Z', '+00:00')
                        )
                    }
                )
                for item in data
            ]
        except Exception as e:
            logger.warn('Failed to load test history', {
                'history_file': self.history_file,
                'error': str(e)
            })
            return []

    def _save_history(self, history: list[TestRunResult]) -> None:
        """Save test run history"""
        # Convert dataclasses to dicts and datetime to ISO strings
        serializable = []
        for result in history:
            data = asdict(result)
            data['timestamp'] = result.timestamp.isoformat()
            serializable.append(data)

        with open(self.history_file, 'w') as f:
            json.dump(serializable, f, indent=2)

    def get_recent_runs(self, count: int = DEFAULT_RECENT_RUNS) -> list[TestRunResult]:
        """
        Get Recent Test Runs

        Args:
            count: Number of recent runs to retrieve (default: 10)

        Returns:
            Recent test runs
        """
        history = self._load_history()
        return history[-count:] if len(history) >= count else history

    def get_runs_for_period(self, days: int) -> list[TestRunResult]:
        """
        Get Test Runs for Period

        Args:
            days: Number of days to look back

        Returns:
            Test runs within period
        """
        history = self._load_history()
        cutoff = datetime.now() - timedelta(days=days)

        return [r for r in history if r.timestamp >= cutoff]

    def calculate_baseline(self, runs: int = DEFAULT_BASELINE_RUNS) -> Optional[AggregatedMetrics]:
        """
        Calculate Baseline Metrics

        Uses recent historical data to establish baseline for comparison.

        Args:
            runs: Number of recent runs to use for baseline (default: 10)

        Returns:
            Baseline metrics or None if insufficient data
        """
        recent_runs = self.get_recent_runs(runs)

        if len(recent_runs) < self.thresholds.min_test_runs:
            return None  # Not enough data

        total_tests = sum(r.total_tests for r in recent_runs)
        total_passed = sum(r.passed for r in recent_runs)

        similarities = [r.avg_similarity for r in recent_runs if r.avg_similarity is not None]
        latencies = [r.avg_latency for r in recent_runs if r.avg_latency is not None]

        return AggregatedMetrics(
            period=f'last_{runs}_runs',
            test_runs=len(recent_runs),
            avg_pass_rate=total_passed / total_tests if total_tests > 0 else 0.0,
            avg_similarity=self._mean(similarities),
            avg_latency=self._mean(latencies),
            trend=self._calculate_trend(recent_runs)
        )

    def _calculate_trend(
        self,
        runs: list[TestRunResult]
    ) -> Literal['improving', 'stable', 'degrading']:
        """
        Calculate Trend

        Determines if metrics are improving, stable, or degrading.
        Compares first half vs second half of recent runs.
        """
        # Need minimum runs for meaningful trend analysis
        if len(runs) < MIN_RUNS_FOR_TREND:
            return 'stable'

        mid = len(runs) // 2
        first_half = runs[:mid]
        second_half = runs[mid:]

        first_avg_sim = self._mean([
            r.avg_similarity for r in first_half if r.avg_similarity is not None
        ])
        second_avg_sim = self._mean([
            r.avg_similarity for r in second_half if r.avg_similarity is not None
        ])

        # Handle case where we have no similarity data
        if first_avg_sim == 0 or second_avg_sim == 0:
            return 'stable'

        change = second_avg_sim - first_avg_sim

        if change > TREND_IMPROVEMENT_THRESHOLD:
            return 'improving'
        if change < TREND_DEGRADATION_THRESHOLD:
            return 'degrading'
        return 'stable'

    def check_for_regressions(self) -> list[RegressionAlert]:
        """
        Check for Regressions

        Compares latest run against baseline to detect quality/performance regressions.

        Returns:
            List of regression alerts
        """
        alerts: list[RegressionAlert] = []
        history = self._load_history()

        if len(history) < self.thresholds.min_test_runs + 1:
            return []  # Not enough data

        latest = history[-1]
        baseline = self.calculate_baseline(DEFAULT_BASELINE_RUNS)

        if not baseline:
            return []

        # Check similarity regression
        if latest.avg_similarity is not None:
            sim_change = (latest.avg_similarity - baseline.avg_similarity) / baseline.avg_similarity

            if sim_change < -self.thresholds.similarity_drop:
                severity = (
                    'critical'
                    if sim_change <= -CRITICAL_SIMILARITY_DROP_THRESHOLD
                    else 'warning'
                )
                message = (
                    f"Similarity dropped {abs(sim_change * 100):.1f}% "
                    f"({latest.avg_similarity:.2f} vs baseline "
                    f"{baseline.avg_similarity:.2f})"
                )
                alerts.append(RegressionAlert(
                    severity=severity,
                    metric='similarity',
                    current=latest.avg_similarity,
                    baseline=baseline.avg_similarity,
                    percent_change=sim_change * 100,
                    message=message,
                    timestamp=latest.timestamp
                ))

        # Check latency regression
        if latest.avg_latency is not None and baseline.avg_latency > 0:
            latency_change = (latest.avg_latency - baseline.avg_latency) / baseline.avg_latency

            if latency_change > self.thresholds.latency_increase:
                severity = (
                    'critical'
                    if latency_change >= CRITICAL_LATENCY_INCREASE_THRESHOLD
                    else 'warning'
                )
                message = (
                    f"Latency increased {latency_change * 100:.1f}% "
                    f"({latest.avg_latency:.0f}ms vs baseline "
                    f"{baseline.avg_latency:.0f}ms)"
                )
                alerts.append(RegressionAlert(
                    severity=severity,
                    metric='latency',
                    current=latest.avg_latency,
                    baseline=baseline.avg_latency,
                    percent_change=latency_change * 100,
                    message=message,
                    timestamp=latest.timestamp
                ))

        # Check pass rate regression
        current_pass_rate = latest.passed / latest.total_tests if latest.total_tests > 0 else 0.0
        pass_rate_change = current_pass_rate - baseline.avg_pass_rate

        if pass_rate_change < -self.thresholds.pass_rate_drop:
            severity = (
                'critical'
                if pass_rate_change < -CRITICAL_PASS_RATE_DROP_THRESHOLD
                else 'warning'
            )
            percent_change = (
                (pass_rate_change / baseline.avg_pass_rate) * 100
                if baseline.avg_pass_rate > 0
                else 0.0
            )
            message = (
                f"Pass rate dropped {abs(pass_rate_change * 100):.1f}% "
                f"({current_pass_rate * 100:.1f}% vs baseline "
                f"{baseline.avg_pass_rate * 100:.1f}%)"
            )
            alerts.append(RegressionAlert(
                severity=severity,
                metric='pass_rate',
                current=current_pass_rate,
                baseline=baseline.avg_pass_rate,
                percent_change=percent_change,
                message=message,
                timestamp=latest.timestamp
            ))

        return alerts

    def generate_dashboard(self) -> str:
        """
        Generate Dashboard Report

        Creates a summary of current system health and trends.

        Returns:
            Human-readable dashboard report
        """
        baseline = self.calculate_baseline(DEFAULT_BASELINE_RUNS)
        recent = self.get_recent_runs(1)
        latest = recent[0] if recent else None
        alerts = self.check_for_regressions()

        if not baseline or not latest:
            return 'Insufficient data for dashboard (need at least 3 test runs)'

        report = f"""
Test Metrics Dashboard
======================

Latest Run: {latest.timestamp.isoformat()}
Test Suite: {latest.test_suite or 'unknown'}

Current Status:
  Tests: {latest.passed}/{latest.total_tests} passed """
        pass_pct = latest.passed / latest.total_tests * 100
        report += f"({pass_pct:.1f}%)\n"
        report += f"""  Duration: {latest.duration / 1000:.1f}s
"""

        if latest.avg_similarity is not None:
            report += f"  Similarity: {latest.avg_similarity:.2f}\n"

        if latest.avg_latency is not None:
            report += f"  Latency: {latest.avg_latency:.0f}ms\n"

        report += f"""
Baseline (Last 10 Runs):
  Avg Pass Rate: {baseline.avg_pass_rate * 100:.1f}%
  Avg Similarity: {baseline.avg_similarity:.2f}
  Avg Latency: {baseline.avg_latency:.0f}ms
  Trend: {baseline.trend}

Alerts:
"""

        if len(alerts) == 0:
            report += '  No regressions detected\n'
        else:
            for alert in alerts:
                icon = 'CRITICAL' if alert.severity == 'critical' else 'WARNING'
                report += f"  [{icon}] {alert.message}\n"

        return report.strip()

    def export_prometheus_metrics(self) -> str:
        """
        Export Metrics for External Systems

        Exports in Prometheus-compatible format for integration with monitoring systems.

        Returns:
            Prometheus-formatted metrics
        """
        recent = self.get_recent_runs(1)
        if not recent:
            return ''

        latest = recent[0]
        metrics: list[str] = []

        # Test metrics
        metrics.append('# HELP llm_tests_total Total number of tests run')
        metrics.append('# TYPE llm_tests_total gauge')
        metrics.append(f'llm_tests_total{{suite="{latest.test_suite}"}} {latest.total_tests}')

        metrics.append('# HELP llm_tests_passed Number of tests passed')
        metrics.append('# TYPE llm_tests_passed gauge')
        metrics.append(f'llm_tests_passed{{suite="{latest.test_suite}"}} {latest.passed}')

        # Quality metrics
        if latest.avg_similarity is not None:
            metrics.append('# HELP llm_similarity_score Average similarity score')
            metrics.append('# TYPE llm_similarity_score gauge')
            metrics.append(
                f'llm_similarity_score{{suite="{latest.test_suite}"}} '
                f'{latest.avg_similarity}'
            )

        # Performance metrics
        if latest.avg_latency is not None:
            metrics.append('# HELP llm_latency_ms Average latency in milliseconds')
            metrics.append('# TYPE llm_latency_ms gauge')
            metrics.append(f'llm_latency_ms{{suite="{latest.test_suite}"}} {latest.avg_latency}')

        return '\n'.join(metrics)

    def set_thresholds(self, thresholds: AlertThresholds) -> None:
        """
        Set Custom Alert Thresholds

        Args:
            thresholds: New alert thresholds
        """
        self.thresholds = thresholds

    def clear_history(self) -> None:
        """
        Clear All History

        Useful for testing or resetting metrics.
        """
        self._save_history([])

    # Statistical helpers

    def _mean(self, values: list[float]) -> float:
        """Calculate mean"""
        if len(values) == 0:
            return 0.0
        return sum(values) / len(values)
