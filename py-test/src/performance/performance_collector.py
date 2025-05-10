"""
Performance Metrics Collector for LLM Applications

Tracks and analyzes performance metrics for LLM operations:
- Latency: Response time in milliseconds
- Tokens: Input, output, and total token counts
- Cost: Estimated cost based on token usage and model pricing
- Throughput: Requests per second, tokens per second
- Percentiles: P50, P95, P99 latency distribution

Why Performance Tracking for LLMs?
LLMs have unique performance characteristics:
- Variable latency (depends on output length)
- Token-based pricing (costs vary by usage)
- High variance in response times
- Need to track cost vs quality trade-offs

Performance Goals:
- P95 latency < 2000ms (acceptable for most use cases)
- P99 latency < 5000ms (edge case handling)
- Cost per request < $0.01 (for local models, minimal cost)
- Throughput > 10 req/s (for production workloads)

Usage Example:
```python
collector = PerformanceCollector()
metric = collector.start_request()

# ... make LLM call ...

metric.end(input_tokens=100, output_tokens=50, model='llama3.1:8b')

report = collector.generate_report()
print(f"P95 latency: {report['p95_latency']}ms")
print(f"Total cost: ${report['total_cost']}")
```
"""

import math
import time
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime
from typing import Optional, Union

# Model Pricing Information
#
# Pricing per 1M tokens for various models.
# Local models (Ollama) are free but included for comparison.
MODEL_PRICING: dict[str, dict[str, float]] = {
    # Local models (Ollama) - free
    'llama3.1:8b': {'input': 0, 'output': 0},
    'llama3.2:latest': {'input': 0, 'output': 0},
    'mistral:7b': {'input': 0, 'output': 0},

    # Commercial models (for reference/comparison)
    'gpt-4': {'input': 30.0, 'output': 60.0},
    'gpt-4-turbo': {'input': 10.0, 'output': 30.0},
    'gpt-3.5-turbo': {'input': 0.5, 'output': 1.5},
    'claude-3-opus': {'input': 15.0, 'output': 75.0},
    'claude-3-sonnet': {'input': 3.0, 'output': 15.0},
    'claude-3-haiku': {'input': 0.25, 'output': 1.25},
}


@dataclass
class TokenUsage:
    """Token usage information"""
    input_tokens: int
    output_tokens: int
    model: str


@dataclass
class PerformanceMetric:
    """Performance metric for a single request"""
    request_id: str
    start_time: float
    end_time: Optional[float] = None
    latency: Optional[float] = None  # in milliseconds
    input_tokens: Optional[int] = None
    output_tokens: Optional[int] = None
    total_tokens: Optional[int] = None
    model: Optional[str] = None
    cost: Optional[float] = None  # in dollars
    success: bool = True
    error: Optional[str] = None


@dataclass
class PerformanceReport:
    """Performance report"""
    total_requests: int
    successful_requests: int
    failed_requests: int
    error_rate: float  # 0.0 - 1.0

    # Latency metrics (in milliseconds)
    mean_latency: float
    median_latency: float
    p95_latency: float
    p99_latency: float
    min_latency: float
    max_latency: float
    std_deviation: float

    # Token metrics
    total_input_tokens: int
    total_output_tokens: int
    total_tokens: int
    mean_input_tokens: float
    mean_output_tokens: float

    # Cost metrics (in dollars)
    total_cost: float
    mean_cost: float

    # Throughput metrics
    duration: float  # in seconds
    requests_per_second: float
    tokens_per_second: float

    # Time range
    start_time: datetime
    end_time: datetime


@dataclass
class PerformanceSLO:
    """Service Level Objective (SLO)

    Defines performance thresholds for the system.
    """
    max_p95_latency: float  # in milliseconds
    max_p99_latency: float  # in milliseconds
    max_error_rate: float  # 0.0 - 1.0 (e.g., 0.01 = 1%)
    min_throughput: Optional[float] = None  # requests per second
    max_cost_per_request: Optional[float] = None  # in dollars


@dataclass
class SLOResult:
    """SLO check result"""
    passed: bool
    violations: list[str]
    report: PerformanceReport


class RequestHandle:
    """Request handle returned by start_request()"""

    def __init__(self, request_id: str, collector: 'PerformanceCollector'):
        self.request_id = request_id
        self._collector = collector

    def end(self, usage: Optional[TokenUsage] = None, error: Optional[str] = None) -> None:
        """End request and record metrics"""
        self._collector._end_request(self.request_id, usage, error)


class PerformanceCollector:
    """Performance Collector Class"""

    def __init__(self) -> None:
        self._metrics: list[PerformanceMetric] = []
        self._active_requests: dict[str, PerformanceMetric] = {}
        self._request_counter = 0

    def start_request(self) -> RequestHandle:
        """
        Start Tracking a New Request

        Returns a request handle that can be used to end the request
        and record its metrics.

        Returns:
            Request handle with end() method
        """
        self._request_counter += 1
        request_id = f"req_{self._request_counter}_{int(time.time() * 1000)}"

        metric = PerformanceMetric(
            request_id=request_id,
            start_time=time.time() * 1000,  # milliseconds
            success=True
        )

        self._active_requests[request_id] = metric

        return RequestHandle(request_id, self)

    def _end_request(
        self,
        request_id: str,
        usage: Optional[TokenUsage] = None,
        error: Optional[str] = None
    ) -> None:
        """
        End Request and Record Metrics

        Args:
            request_id: Request identifier
            usage: Token usage information (optional)
            error: Error message if request failed (optional)
        """
        metric = self._active_requests.get(request_id)
        if not metric:
            raise ValueError(f"Request {request_id} not found")

        metric.end_time = time.time() * 1000  # milliseconds
        metric.latency = metric.end_time - metric.start_time

        if error:
            metric.success = False
            metric.error = error

        if usage:
            metric.input_tokens = usage.input_tokens
            metric.output_tokens = usage.output_tokens
            metric.total_tokens = usage.input_tokens + usage.output_tokens
            metric.model = usage.model
            metric.cost = self._calculate_cost(usage)

        self._metrics.append(metric)
        del self._active_requests[request_id]

    def _calculate_cost(self, usage: TokenUsage) -> float:
        """
        Calculate Cost for Token Usage

        Args:
            usage: Token usage information

        Returns:
            Cost in dollars
        """
        pricing: Optional[dict[str, float]] = MODEL_PRICING.get(usage.model)

        if not pricing:
            # Unknown model, assume free (local model)
            return 0.0

        # Pricing is per 1M tokens, so divide by 1,000,000
        input_cost = (usage.input_tokens / 1_000_000) * pricing['input']
        output_cost = (usage.output_tokens / 1_000_000) * pricing['output']

        return input_cost + output_cost

    def record_metric(self, metric: PerformanceMetric) -> None:
        """
        Record a Complete Metric Manually

        Alternative to start_request/end_request for pre-computed metrics.

        Args:
            metric: Complete performance metric
        """
        self._metrics.append(metric)

    def get_metrics(self) -> list[PerformanceMetric]:
        """
        Get All Recorded Metrics

        Returns:
            List of all performance metrics
        """
        return self._metrics.copy()

    def get_metrics_by_status(self, success: bool) -> list[PerformanceMetric]:
        """
        Get Metrics Filtered by Success/Failure

        Args:
            success: Filter by success status

        Returns:
            Filtered metrics
        """
        return [m for m in self._metrics if m.success == success]

    def get_metrics_by_model(self, model: str) -> list[PerformanceMetric]:
        """
        Get Metrics Filtered by Model

        Args:
            model: Model name

        Returns:
            Filtered metrics
        """
        return [m for m in self._metrics if m.model == model]

    def clear(self) -> None:
        """
        Clear All Metrics

        Useful for starting a new test run.
        """
        self._metrics = []
        self._active_requests.clear()
        self._request_counter = 0

    def generate_report(self) -> PerformanceReport:
        """
        Generate Performance Report

        Analyzes all recorded metrics and generates a comprehensive report
        with latency percentiles, token usage, cost, and throughput.

        Returns:
            Performance report
        """
        if len(self._metrics) == 0:
            raise ValueError('No metrics recorded')

        successful = [m for m in self._metrics if m.success]
        failed = [m for m in self._metrics if not m.success]

        # Calculate latency statistics
        latencies = [m.latency for m in successful if m.latency is not None]
        latencies.sort()

        # Guard against empty latencies array (all requests failed or no latency data)
        if len(latencies) == 0:
            raise ValueError('No successful requests with latency data to generate report')

        mean_latency = self._mean(latencies)
        std_deviation = self._standard_deviation(latencies, mean_latency)

        # Calculate token statistics
        input_tokens = [m.input_tokens or 0 for m in successful]
        output_tokens = [m.output_tokens or 0 for m in successful]
        costs = [m.cost or 0.0 for m in successful]

        # Calculate time range
        start_times = [m.start_time for m in self._metrics]
        end_times = [m.end_time or m.start_time for m in self._metrics]
        min_time = min(start_times)
        max_time = max(end_times)

        # Clamp duration to minimum epsilon to prevent division by zero
        # For single fast requests, duration could be 0ms, leading to Infinity throughput
        min_duration_seconds = 0.001  # 1ms minimum
        duration_raw = (max_time - min_time) / 1000  # in seconds
        duration = max(duration_raw, min_duration_seconds)

        # Calculate totals
        total_input_tokens = sum(input_tokens)
        total_output_tokens = sum(output_tokens)
        total_tokens = total_input_tokens + total_output_tokens
        total_cost = sum(costs)

        return PerformanceReport(
            total_requests=len(self._metrics),
            successful_requests=len(successful),
            failed_requests=len(failed),
            error_rate=len(failed) / len(self._metrics),

            mean_latency=mean_latency,
            median_latency=self._percentile(latencies, 50),
            p95_latency=self._percentile(latencies, 95),
            p99_latency=self._percentile(latencies, 99),
            min_latency=min(latencies),
            max_latency=max(latencies),
            std_deviation=std_deviation,

            total_input_tokens=total_input_tokens,
            total_output_tokens=total_output_tokens,
            total_tokens=total_tokens,
            mean_input_tokens=self._mean(input_tokens),
            mean_output_tokens=self._mean(output_tokens),

            total_cost=total_cost,
            mean_cost=self._mean(costs),

            duration=duration,
            requests_per_second=len(self._metrics) / duration,
            tokens_per_second=total_tokens / duration,

            start_time=datetime.fromtimestamp(min_time / 1000),
            end_time=datetime.fromtimestamp(max_time / 1000)
        )

    def generate_report_text(self) -> str:
        """
        Generate Formatted Report Text

        Returns:
            Human-readable report
        """
        report = self.generate_report()

        return f"""
Performance Report
==================

Requests:
  Total: {report.total_requests}
  Successful: {report.successful_requests}
  Failed: {report.failed_requests}
  Error Rate: {report.error_rate * 100:.2f}%

Latency (ms):
  Mean: {report.mean_latency:.2f}
  Median: {report.median_latency:.2f}
  P95: {report.p95_latency:.2f}
  P99: {report.p99_latency:.2f}
  Min: {report.min_latency:.2f}
  Max: {report.max_latency:.2f}
  Std Dev: {report.std_deviation:.2f}

Tokens:
  Total Input: {report.total_input_tokens:,}
  Total Output: {report.total_output_tokens:,}
  Total: {report.total_tokens:,}
  Mean Input: {report.mean_input_tokens:.0f}
  Mean Output: {report.mean_output_tokens:.0f}

Cost:
  Total: ${report.total_cost:.6f}
  Mean per Request: ${report.mean_cost:.6f}

Throughput:
  Duration: {report.duration:.2f}s
  Requests/sec: {report.requests_per_second:.2f}
  Tokens/sec: {report.tokens_per_second:.0f}

Time Range:
  Start: {report.start_time.isoformat()}
  End: {report.end_time.isoformat()}
        """.strip()

    def check_slo(self, slo: PerformanceSLO) -> SLOResult:
        """
        Check if Performance Meets SLO (Service Level Objective)

        Args:
            slo: Service level objective thresholds

        Returns:
            Whether metrics meet SLO
        """
        report = self.generate_report()
        violations: list[str] = []

        if report.p95_latency > slo.max_p95_latency:
            violations.append(
                f"P95 latency {report.p95_latency:.0f}ms "
                f"exceeds SLO {slo.max_p95_latency}ms"
            )

        if report.p99_latency > slo.max_p99_latency:
            violations.append(
                f"P99 latency {report.p99_latency:.0f}ms exceeds SLO {slo.max_p99_latency}ms"
            )

        if report.error_rate > slo.max_error_rate:
            violations.append(
                f"Error rate {report.error_rate * 100:.1f}% "
                f"exceeds SLO {slo.max_error_rate * 100:.1f}%"
            )

        if slo.min_throughput and report.requests_per_second < slo.min_throughput:
            violations.append(
                f"Throughput {report.requests_per_second:.1f} req/s "
                f"below SLO {slo.min_throughput} req/s"
            )

        if slo.max_cost_per_request and report.mean_cost > slo.max_cost_per_request:
            violations.append(
                f"Mean cost ${report.mean_cost:.6f} exceeds SLO ${slo.max_cost_per_request:.6f}"
            )

        return SLOResult(
            passed=len(violations) == 0,
            violations=violations,
            report=report
        )

    # Statistical helper methods

    def _mean(self, values: Sequence[Union[float, int]]) -> float:
        """Calculate mean"""
        if len(values) == 0:
            return 0.0
        return sum(values) / len(values)

    def _standard_deviation(self, values: Sequence[Union[float, int]], mean: float) -> float:
        """Calculate standard deviation"""
        if len(values) == 0:
            return 0.0
        variance = sum((val - mean) ** 2 for val in values) / len(values)
        return math.sqrt(variance)

    def _percentile(self, sorted_values: Sequence[Union[float, int]], p: float) -> float:
        """Calculate percentile from sorted values"""
        if len(sorted_values) == 0:
            return 0.0
        index = math.ceil((p / 100) * len(sorted_values)) - 1
        index = max(0, min(index, len(sorted_values) - 1))
        return sorted_values[index]
