"""
Unit tests for PerformanceCollector
"""

import time

from src.performance import PerformanceCollector, PerformanceSLO, TokenUsage


class TestPerformanceCollector:
    """Test PerformanceCollector functionality"""

    def test_start_and_end_request(self):
        """Test basic request tracking"""
        collector = PerformanceCollector()

        # Start a request
        handle = collector.start_request()
        time.sleep(0.01)  # Simulate work

        # End the request
        handle.end(usage=TokenUsage(
            input_tokens=100,
            output_tokens=50,
            model='llama3.1:8b'
        ))

        # Verify metrics recorded
        metrics = collector.get_metrics()
        assert len(metrics) == 1
        assert metrics[0].input_tokens == 100
        assert metrics[0].output_tokens == 50
        assert metrics[0].total_tokens == 150
        assert metrics[0].latency > 0
        assert metrics[0].success is True

    def test_error_tracking(self):
        """Test error tracking"""
        collector = PerformanceCollector()

        handle = collector.start_request()
        handle.end(error="Test error")

        metrics = collector.get_metrics()
        assert len(metrics) == 1
        assert metrics[0].success is False
        assert metrics[0].error == "Test error"

    def test_cost_calculation(self):
        """Test cost calculation for different models"""
        collector = PerformanceCollector()

        # Local model (free)
        handle1 = collector.start_request()
        handle1.end(usage=TokenUsage(
            input_tokens=1000,
            output_tokens=500,
            model='llama3.1:8b'
        ))

        # Commercial model
        handle2 = collector.start_request()
        handle2.end(usage=TokenUsage(
            input_tokens=1000,
            output_tokens=500,
            model='gpt-3.5-turbo'
        ))

        metrics = collector.get_metrics()
        assert metrics[0].cost == 0.0  # Local model is free
        assert metrics[1].cost > 0.0  # Commercial model has cost

    def test_generate_report(self):
        """Test report generation"""
        collector = PerformanceCollector()

        # Record multiple requests
        for i in range(10):
            handle = collector.start_request()
            time.sleep(0.001 * (i + 1))  # Variable latency
            handle.end(usage=TokenUsage(
                input_tokens=100 + i * 10,
                output_tokens=50 + i * 5,
                model='llama3.1:8b'
            ))

        report = collector.generate_report()

        assert report.total_requests == 10
        assert report.successful_requests == 10
        assert report.failed_requests == 0
        assert report.error_rate == 0.0
        assert report.mean_latency > 0
        assert report.p95_latency > report.median_latency
        assert report.p99_latency >= report.p95_latency
        assert report.total_tokens == sum((100 + i * 10) + (50 + i * 5) for i in range(10))

    def test_slo_check_passing(self):
        """Test SLO check that passes"""
        collector = PerformanceCollector()

        # Record requests with good performance
        for _ in range(5):
            handle = collector.start_request()
            time.sleep(0.001)
            handle.end(usage=TokenUsage(
                input_tokens=100,
                output_tokens=50,
                model='llama3.1:8b'
            ))

        slo = PerformanceSLO(
            max_p95_latency=1000,  # 1 second
            max_p99_latency=2000,
            max_error_rate=0.01,
            min_throughput=1.0,
            max_cost_per_request=0.01
        )

        result = collector.check_slo(slo)
        assert result.passed is True
        assert len(result.violations) == 0

    def test_slo_check_failing(self):
        """Test SLO check that fails"""
        collector = PerformanceCollector()

        # Record one failing request
        handle1 = collector.start_request()
        time.sleep(0.001)
        handle1.end(error="Timeout")

        # Record one slow successful request
        handle2 = collector.start_request()
        time.sleep(0.001)
        handle2.end(usage=TokenUsage(
            input_tokens=100,
            output_tokens=50,
            model='llama3.1:8b'
        ))

        slo = PerformanceSLO(
            max_p95_latency=0.1,  # Very strict: 0.1ms
            max_p99_latency=0.2,
            max_error_rate=0.0,  # No errors allowed
        )

        result = collector.check_slo(slo)
        assert result.passed is False
        assert len(result.violations) > 0

    def test_metrics_filtering(self):
        """Test filtering metrics by status and model"""
        collector = PerformanceCollector()

        # Successful request
        handle1 = collector.start_request()
        handle1.end(usage=TokenUsage(
            input_tokens=100,
            output_tokens=50,
            model='llama3.1:8b'
        ))

        # Failed request
        handle2 = collector.start_request()
        handle2.end(error="Error")

        # Another model
        handle3 = collector.start_request()
        handle3.end(usage=TokenUsage(
            input_tokens=100,
            output_tokens=50,
            model='mistral:7b'
        ))

        successful = collector.get_metrics_by_status(True)
        failed = collector.get_metrics_by_status(False)
        llama_metrics = collector.get_metrics_by_model('llama3.1:8b')

        assert len(successful) == 2
        assert len(failed) == 1
        assert len(llama_metrics) == 1

    def test_clear(self):
        """Test clearing metrics"""
        collector = PerformanceCollector()

        handle = collector.start_request()
        handle.end()

        assert len(collector.get_metrics()) == 1

        collector.clear()

        assert len(collector.get_metrics()) == 0

    def test_report_text_format(self):
        """Test formatted report text"""
        collector = PerformanceCollector()

        handle = collector.start_request()
        time.sleep(0.001)
        handle.end(usage=TokenUsage(
            input_tokens=100,
            output_tokens=50,
            model='llama3.1:8b'
        ))

        text = collector.generate_report_text()

        assert 'Performance Report' in text
        assert 'Total: 1' in text
        assert 'Successful: 1' in text
        assert 'Latency (ms):' in text
        assert 'Tokens:' in text
