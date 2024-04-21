"""
Unit Tests for Summary Evaluator

Tests the SummaryEvaluator class for quality assessment of LLM-generated summaries.
"""

import pytest

from src.evaluators.summary_evaluator import EvaluationResult, SummaryEvaluator
from src.utils.golden_dataset import GoldenTestCase


@pytest.fixture
def evaluator():
    """Create a SummaryEvaluator instance for testing"""
    return SummaryEvaluator()


@pytest.fixture
def sample_test_case():
    """Create a sample golden test case for testing"""
    return GoldenTestCase(
        id="test_001",
        category="password_reset",
        difficulty="easy",
        transcript="Customer called about password reset issue. Agent helped them reset password.",
        golden_summary="Customer successfully reset password with agent assistance",
        metadata={
            "sentiment": "neutral",
            "resolution": "resolved"
        },
        thresholds={
            "min_semantic_similarity": 0.80,
            "min_length_words": 5,
            "max_length_words": 15,
            "required_terms": ["password", "reset"]
        }
    )


class TestEvaluationResult:
    """Tests for EvaluationResult dataclass"""

    def test_evaluation_result_creation(self):
        """Test creating an EvaluationResult"""
        result = EvaluationResult(
            passed=True,
            similarity=0.85,
            bleu=0.60,
            length_check={'passed': True, 'word_count': 8},
            required_terms={'passed': True, 'coverage': 1.0, 'missing': []},
            failures=[]
        )

        assert result.passed is True
        assert result.similarity == 0.85
        assert result.bleu == 0.60
        assert len(result.failures) == 0

    def test_evaluation_result_with_failures(self):
        """Test EvaluationResult with failures"""
        failures = ["Similarity too low", "Missing required terms"]
        result = EvaluationResult(
            passed=False,
            similarity=0.50,
            bleu=0.30,
            length_check={'passed': True, 'word_count': 10},
            required_terms={'passed': False, 'coverage': 0.5, 'missing': ['password']},
            failures=failures
        )

        assert result.passed is False
        assert len(result.failures) == 2


class TestSummaryEvaluator:
    """Tests for SummaryEvaluator class"""

    def test_evaluate_perfect_match(self, evaluator, sample_test_case):
        """Test evaluation of a perfect match"""
        summary = sample_test_case.golden_summary
        result = evaluator.evaluate(summary, sample_test_case)

        assert result.passed is True
        assert result.similarity >= 0.95
        assert result.bleu >= 0.95
        assert result.length_check['passed'] is True
        assert result.required_terms['passed'] is True
        assert len(result.failures) == 0

    def test_evaluate_good_summary(self, evaluator, sample_test_case):
        """Test evaluation of a semantically similar but differently worded summary"""
        summary = "Customer successfully reset password with agent assistance"
        result = evaluator.evaluate(summary, sample_test_case)

        # Should pass since it's very similar to the golden summary
        assert result.passed is True
        assert result.similarity >= 0.80
        assert result.required_terms['passed'] is True
        assert len(result.failures) == 0

    def test_evaluate_low_similarity(self, evaluator, sample_test_case):
        """Test evaluation failing due to low similarity"""
        summary = "Weather forecast looks good today"
        result = evaluator.evaluate(summary, sample_test_case)

        assert result.passed is False
        assert result.similarity < 0.80
        assert any("Similarity" in failure for failure in result.failures)

    def test_evaluate_missing_required_terms(self, evaluator, sample_test_case):
        """Test evaluation failing due to missing required terms"""
        summary = "Customer issue was resolved successfully"
        result = evaluator.evaluate(summary, sample_test_case)

        assert result.passed is False
        assert result.required_terms['passed'] is False
        assert len(result.required_terms['missing']) > 0
        assert any("Missing required terms" in failure for failure in result.failures)

    def test_evaluate_too_short(self, evaluator, sample_test_case):
        """Test evaluation failing due to summary being too short"""
        summary = "Password reset"
        result = evaluator.evaluate(summary, sample_test_case)

        assert result.passed is False
        assert result.length_check['passed'] is False
        assert result.length_check['word_count'] < sample_test_case.thresholds['min_length_words']
        assert any("Length" in failure for failure in result.failures)

    def test_evaluate_too_long(self, evaluator, sample_test_case):
        """Test evaluation failing due to summary being too long"""
        summary = "The customer called in regarding a password reset issue and " \
                 "the agent provided comprehensive step by step assistance " \
                 "to help them successfully reset their password and regain access"
        result = evaluator.evaluate(summary, sample_test_case)

        assert result.passed is False
        assert result.length_check['passed'] is False
        assert result.length_check['word_count'] > sample_test_case.thresholds['max_length_words']
        assert any("Length" in failure for failure in result.failures)

    def test_evaluate_multiple_failures(self, evaluator, sample_test_case):
        """Test evaluation with multiple failures"""
        summary = "Short"
        result = evaluator.evaluate(summary, sample_test_case)

        assert result.passed is False
        assert len(result.failures) >= 2  # Should fail on length, similarity, and required terms


class TestConsistencyEvaluation:
    """Tests for consistency evaluation across multiple summaries"""

    def test_evaluate_consistency_identical(self, evaluator):
        """Test consistency of identical summaries"""
        summaries = [
            "Customer password reset successful",
            "Customer password reset successful",
            "Customer password reset successful"
        ]
        result = evaluator.evaluate_consistency(summaries)

        assert result['mean_similarity'] >= 0.99
        assert result['std_deviation'] < 0.01
        assert result['max_variance'] < 0.01

    def test_evaluate_consistency_similar(self, evaluator):
        """Test consistency of similar summaries"""
        summaries = [
            "Customer successfully reset password",
            "Password reset completed for customer",
            "Customer password was reset"
        ]
        result = evaluator.evaluate_consistency(summaries)

        # These summaries are fairly similar, expect moderate consistency
        assert 0.60 < result['mean_similarity'] < 1.0
        assert result['std_deviation'] < 0.25

    def test_evaluate_consistency_different(self, evaluator):
        """Test consistency of very different summaries"""
        summaries = [
            "Customer password reset successful",
            "Weather is sunny today",
            "Product shipped yesterday"
        ]
        result = evaluator.evaluate_consistency(summaries)

        # Very different summaries should have low similarity
        assert result['mean_similarity'] < 0.50
        # Standard deviation should be >= 0 (could be 0 if all similarities are 0)
        assert result['std_deviation'] >= 0.0

    def test_evaluate_consistency_single_summary(self, evaluator):
        """Test consistency with only one summary"""
        summaries = ["Customer password reset"]
        result = evaluator.evaluate_consistency(summaries)

        # Single summary should return perfect consistency
        assert result['mean_similarity'] == 1.0
        assert result['std_deviation'] == 0.0
        assert result['max_variance'] == 0.0

    def test_evaluate_consistency_empty_list(self, evaluator):
        """Test consistency with empty list"""
        summaries = []
        result = evaluator.evaluate_consistency(summaries)

        # Empty list should return perfect consistency by default
        assert result['mean_similarity'] == 1.0
        assert result['std_deviation'] == 0.0


class TestReportGeneration:
    """Tests for detailed report generation"""

    def test_generate_report_passed(self, evaluator, sample_test_case):
        """Test report generation for a passing evaluation"""
        summary = sample_test_case.golden_summary
        report = evaluator.generate_report(summary, sample_test_case)

        assert "test_001" in report
        assert "✅ PASSED" in report
        assert "password_reset" in report
        assert "easy" in report
        assert str(sample_test_case.thresholds['min_semantic_similarity']) in report

    def test_generate_report_failed(self, evaluator, sample_test_case):
        """Test report generation for a failing evaluation"""
        summary = "Weather forecast"
        report = evaluator.generate_report(summary, sample_test_case)

        assert "test_001" in report
        assert "❌ FAILED" in report
        assert "Failures:" in report
        assert "Reference Summary:" in report
        assert "Generated Summary:" in report

    def test_generate_report_contains_metrics(self, evaluator, sample_test_case):
        """Test that report contains all required metrics"""
        summary = "Customer password reset completed"
        report = evaluator.generate_report(summary, sample_test_case)

        assert "Similarity:" in report
        assert "BLEU Score:" in report
        assert "Word Count:" in report
        assert "Required Terms Coverage:" in report

    def test_generate_report_format(self, evaluator, sample_test_case):
        """Test report format structure"""
        summary = sample_test_case.golden_summary
        report = evaluator.generate_report(summary, sample_test_case)

        # Check for section separators
        assert "=" * 50 in report
        assert "Metrics:" in report
        assert "Reference Summary:" in report
        assert "Generated Summary:" in report
