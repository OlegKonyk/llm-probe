"""
Unit tests for MetricsAggregator
"""

import shutil
import tempfile
from datetime import datetime, timedelta

import pytest

from src.monitoring import AlertThresholds, MetricsAggregator, TestRunResult


class TestMetricsAggregator:
    """Test MetricsAggregator functionality"""

    @pytest.fixture
    def temp_dir(self):
        """Create temporary directory for test data"""
        temp = tempfile.mkdtemp()
        yield temp
        shutil.rmtree(temp)

    @pytest.fixture
    def aggregator(self, temp_dir):
        """Create aggregator with temp directory"""
        return MetricsAggregator(data_dir=temp_dir)

    def test_record_and_retrieve_test_run(self, aggregator):
        """Test recording and retrieving test runs"""
        result = TestRunResult(
            timestamp=datetime.now(),
            test_suite='unit',
            total_tests=10,
            passed=9,
            failed=1,
            skipped=0,
            duration=1000.0,
            avg_similarity=0.85,
            avg_latency=500.0
        )

        aggregator.record_test_run(result)

        recent = aggregator.get_recent_runs(1)
        assert len(recent) == 1
        assert recent[0].test_suite == 'unit'
        assert recent[0].passed == 9

    def test_calculate_baseline(self, aggregator):
        """Test baseline calculation"""
        # Record 5 test runs
        for i in range(5):
            result = TestRunResult(
                timestamp=datetime.now(),
                test_suite='test',
                total_tests=10,
                passed=9,
                failed=1,
                skipped=0,
                duration=1000.0,
                avg_similarity=0.80 + i * 0.01,
                avg_latency=500.0 + i * 10
            )
            aggregator.record_test_run(result)

        baseline = aggregator.calculate_baseline(5)
        assert baseline is not None
        assert baseline.test_runs == 5
        assert 0.8 < baseline.avg_similarity < 0.9
        assert 500 <= baseline.avg_latency <= 600

    def test_baseline_insufficient_data(self, aggregator):
        """Test baseline with insufficient data"""
        # Only record 1 run (need at least 3)
        result = TestRunResult(
            timestamp=datetime.now(),
            test_suite='test',
            total_tests=10,
            passed=9,
            failed=1,
            skipped=0,
            duration=1000.0
        )
        aggregator.record_test_run(result)

        baseline = aggregator.calculate_baseline()
        assert baseline is None

    def test_check_for_regressions_similarity(self, aggregator):
        """Test regression detection for similarity"""
        # Record baseline runs with good similarity
        for i in range(5):
            result = TestRunResult(
                timestamp=datetime.now(),
                test_suite='test',
                total_tests=10,
                passed=10,
                failed=0,
                skipped=0,
                duration=1000.0,
                avg_similarity=0.85,
                avg_latency=500.0
            )
            aggregator.record_test_run(result)

        # Record run with degraded similarity (15% drop)
        bad_result = TestRunResult(
            timestamp=datetime.now(),
            test_suite='test',
            total_tests=10,
            passed=10,
            failed=0,
            skipped=0,
            duration=1000.0,
            avg_similarity=0.70,  # Significant drop
            avg_latency=500.0
        )
        aggregator.record_test_run(bad_result)

        alerts = aggregator.check_for_regressions()
        assert len(alerts) > 0
        assert any(a.metric == 'similarity' for a in alerts)

    def test_check_for_regressions_latency(self, aggregator):
        """Test regression detection for latency"""
        # Record baseline runs
        for i in range(5):
            result = TestRunResult(
                timestamp=datetime.now(),
                test_suite='test',
                total_tests=10,
                passed=10,
                failed=0,
                skipped=0,
                duration=1000.0,
                avg_similarity=0.85,
                avg_latency=500.0
            )
            aggregator.record_test_run(result)

        # Record run with increased latency (50% increase)
        slow_result = TestRunResult(
            timestamp=datetime.now(),
            test_suite='test',
            total_tests=10,
            passed=10,
            failed=0,
            skipped=0,
            duration=1000.0,
            avg_similarity=0.85,
            avg_latency=750.0  # 50% increase
        )
        aggregator.record_test_run(slow_result)

        alerts = aggregator.check_for_regressions()
        assert len(alerts) > 0
        assert any(a.metric == 'latency' for a in alerts)

    def test_check_for_regressions_pass_rate(self, aggregator):
        """Test regression detection for pass rate"""
        # Record baseline runs with high pass rate
        for i in range(5):
            result = TestRunResult(
                timestamp=datetime.now(),
                test_suite='test',
                total_tests=10,
                passed=10,
                failed=0,
                skipped=0,
                duration=1000.0,
                avg_similarity=0.85,
                avg_latency=500.0
            )
            aggregator.record_test_run(result)

        # Record run with lower pass rate (10% drop)
        failing_result = TestRunResult(
            timestamp=datetime.now(),
            test_suite='test',
            total_tests=10,
            passed=9,  # One test failed
            failed=1,
            skipped=0,
            duration=1000.0,
            avg_similarity=0.85,
            avg_latency=500.0
        )
        aggregator.record_test_run(failing_result)

        alerts = aggregator.check_for_regressions()
        assert len(alerts) > 0
        assert any(a.metric == 'pass_rate' for a in alerts)

    def test_trend_calculation(self, aggregator):
        """Test trend calculation"""
        # Record improving trend
        for i in range(10):
            result = TestRunResult(
                timestamp=datetime.now(),
                test_suite='test',
                total_tests=10,
                passed=10,
                failed=0,
                skipped=0,
                duration=1000.0,
                avg_similarity=0.75 + i * 0.02,  # Improving
                avg_latency=500.0
            )
            aggregator.record_test_run(result)

        baseline = aggregator.calculate_baseline(10)
        assert baseline is not None
        assert baseline.trend == 'improving'

    def test_get_runs_for_period(self, aggregator):
        """Test getting runs for a time period"""
        # Record runs over different days
        now = datetime.now()

        # Old run (10 days ago)
        old_result = TestRunResult(
            timestamp=now - timedelta(days=10),
            test_suite='test',
            total_tests=10,
            passed=10,
            failed=0,
            skipped=0,
            duration=1000.0
        )
        aggregator.record_test_run(old_result)

        # Recent run
        recent_result = TestRunResult(
            timestamp=now,
            test_suite='test',
            total_tests=10,
            passed=10,
            failed=0,
            skipped=0,
            duration=1000.0
        )
        aggregator.record_test_run(recent_result)

        # Get runs from last 7 days
        recent_runs = aggregator.get_runs_for_period(7)
        assert len(recent_runs) == 1
        assert recent_runs[0].timestamp == recent_result.timestamp

    def test_generate_dashboard(self, aggregator):
        """Test dashboard generation"""
        # Record some test runs
        for i in range(5):
            result = TestRunResult(
                timestamp=datetime.now(),
                test_suite='e2e',
                total_tests=10,
                passed=9,
                failed=1,
                skipped=0,
                duration=1000.0,
                avg_similarity=0.85,
                avg_latency=500.0
            )
            aggregator.record_test_run(result)

        dashboard = aggregator.generate_dashboard()
        assert 'Test Metrics Dashboard' in dashboard
        assert 'e2e' in dashboard
        assert 'Current Status:' in dashboard
        assert 'Baseline' in dashboard

    def test_export_prometheus_metrics(self, aggregator):
        """Test Prometheus metrics export"""
        result = TestRunResult(
            timestamp=datetime.now(),
            test_suite='integration',
            total_tests=15,
            passed=14,
            failed=1,
            skipped=0,
            duration=2000.0,
            avg_similarity=0.88,
            avg_latency=450.0
        )
        aggregator.record_test_run(result)

        metrics = aggregator.export_prometheus_metrics()
        assert 'llm_tests_total' in metrics
        assert 'llm_tests_passed' in metrics
        assert 'llm_similarity_score' in metrics
        assert 'llm_latency_ms' in metrics
        assert 'integration' in metrics

    def test_custom_thresholds(self, aggregator):
        """Test setting custom alert thresholds"""
        custom_thresholds = AlertThresholds(
            similarity_drop=0.05,
            latency_increase=0.15,
            pass_rate_drop=0.02,
            min_test_runs=2
        )

        aggregator.set_thresholds(custom_thresholds)
        assert aggregator.thresholds.similarity_drop == 0.05
        assert aggregator.thresholds.latency_increase == 0.15

    def test_clear_history(self, aggregator):
        """Test clearing history"""
        result = TestRunResult(
            timestamp=datetime.now(),
            test_suite='test',
            total_tests=10,
            passed=10,
            failed=0,
            skipped=0,
            duration=1000.0
        )
        aggregator.record_test_run(result)

        assert len(aggregator.get_recent_runs(10)) == 1

        aggregator.clear_history()

        assert len(aggregator.get_recent_runs(10)) == 0
