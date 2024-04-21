"""
Unit Tests for Text Similarity Metrics

Tests the core similarity metrics used for LLM output evaluation.
"""

import pytest

from src.metrics.text_similarity import (
    bleu_score,
    composite_similarity,
    contains_required_terms,
    cosine_similarity,
    jaccard_similarity,
    ngram_precision,
    overlap_coefficient,
    validate_length,
)


class TestCosineSimilarity:
    """Tests for cosine similarity metric"""

    def test_identical_texts(self):
        """Identical texts should have similarity of 1.0"""
        text = "customer had an issue"
        result = cosine_similarity(text, text)
        assert result == pytest.approx(1.0, abs=0.01)

    def test_completely_different(self):
        """Completely different texts should have low similarity"""
        text1 = "customer service call"
        text2 = "weather forecast today"
        result = cosine_similarity(text1, text2)
        assert result == 0.0

    def test_partial_overlap(self):
        """Texts with partial overlap should have moderate similarity"""
        text1 = "customer had password issue"
        text2 = "customer reset password"
        result = cosine_similarity(text1, text2)
        assert 0.3 < result < 0.9

    def test_empty_text(self):
        """Empty text should return 0"""
        result = cosine_similarity("", "some text")
        assert result == 0.0


class TestJaccardSimilarity:
    """Tests for Jaccard similarity metric"""

    def test_identical_sets(self):
        """Identical word sets should have similarity of 1.0"""
        text = "customer issue resolved"
        result = jaccard_similarity(text, text)
        assert result == pytest.approx(1.0, abs=0.01)

    def test_no_overlap(self):
        """No word overlap should return 0"""
        text1 = "customer service"
        text2 = "weather forecast"
        result = jaccard_similarity(text1, text2)
        assert result == 0.0

    def test_partial_overlap(self):
        """Partial overlap should give intersection/union"""
        text1 = "customer issue resolved"
        text2 = "customer problem fixed"
        result = jaccard_similarity(text1, text2)
        # 1 common word (customer) / 5 unique words
        assert result == pytest.approx(0.2, abs=0.01)

    def test_both_empty(self):
        """Both texts empty should return 0"""
        result = jaccard_similarity("", "")
        assert result == 0.0


class TestOverlapCoefficient:
    """Tests for overlap coefficient metric"""

    def test_subset_relationship(self):
        """One text being subset of another should return 1.0"""
        text1 = "customer issue"
        text2 = "customer had an issue with account"
        result = overlap_coefficient(text1, text2)
        assert result == pytest.approx(1.0, abs=0.01)

    def test_no_overlap(self):
        """No overlap should return 0"""
        text1 = "customer service"
        text2 = "weather forecast"
        result = overlap_coefficient(text1, text2)
        assert result == 0.0

    def test_one_empty(self):
        """One text empty should return 0"""
        result = overlap_coefficient("", "customer service")
        assert result == 0.0


class TestCompositeSimilarity:
    """Tests for composite similarity metric"""

    def test_identical_texts(self):
        """Identical texts should have high composite similarity"""
        text = "customer had issue resolved"
        result = composite_similarity(text, text)
        assert result >= 0.95

    def test_similar_texts(self):
        """Similar texts should have moderate-high similarity"""
        text1 = "customer password reset successful"
        text2 = "customer reset password successfully"
        result = composite_similarity(text1, text2)
        assert 0.6 < result < 0.95

    def test_different_texts(self):
        """Very different texts should have low similarity"""
        text1 = "customer service call"
        text2 = "weather forecast today"
        result = composite_similarity(text1, text2)
        assert result < 0.3


class TestRequiredTerms:
    """Tests for required terms validation"""

    def test_all_terms_present(self):
        """All required terms present should pass"""
        text = "Customer reset password successfully"
        required = ["password", "reset", "customer"]
        result = contains_required_terms(text, required)

        assert result['passed'] is True
        assert result['coverage'] == 1.0
        assert result['missing'] == []

    def test_some_terms_missing(self):
        """Missing terms should fail with list of missing"""
        text = "Account issue was fixed"
        required = ["password", "reset", "email"]
        result = contains_required_terms(text, required)

        assert result['passed'] is False
        assert result['coverage'] == 0.0
        assert len(result['missing']) == 3

    def test_case_insensitive(self):
        """Term matching should be case-insensitive"""
        text = "CUSTOMER Reset PASSWORD"
        required = ["customer", "reset", "password"]
        result = contains_required_terms(text, required)

        assert result['passed'] is True

    def test_empty_required_terms(self):
        """Empty required terms list should auto-pass"""
        text = "anything"
        result = contains_required_terms(text, [])

        assert result['passed'] is True
        assert result['coverage'] == 1.0


class TestLengthValidation:
    """Tests for length validation"""

    def test_within_range(self):
        """Word count within range should pass"""
        text = "Customer had issue resolved successfully"
        result = validate_length(text, 3, 10)

        assert result['passed'] is True
        assert result['word_count'] == 5

    def test_too_short(self):
        """Too few words should fail"""
        text = "Short"
        result = validate_length(text, 5, 10)

        assert result['passed'] is False
        assert result['word_count'] == 1

    def test_too_long(self):
        """Too many words should fail"""
        text = " ".join(["word"] * 20)
        result = validate_length(text, 5, 10)

        assert result['passed'] is False
        assert result['word_count'] == 20

    def test_negative_min_words(self):
        """Negative min_words should raise ValueError"""
        with pytest.raises(ValueError, match="must be non-negative"):
            validate_length("test", -1, 10)

    def test_negative_max_words(self):
        """Negative max_words should raise ValueError"""
        with pytest.raises(ValueError, match="must be non-negative"):
            validate_length("test", 5, -1)

    def test_min_greater_than_max(self):
        """min_words > max_words should raise ValueError"""
        with pytest.raises(ValueError, match="cannot be greater than"):
            validate_length("test", 10, 5)


class TestNgramPrecision:
    """Tests for n-gram precision"""

    def test_unigram_precision(self):
        """Unigram precision should count word matches"""
        reference = "customer had issue"
        candidate = "customer had problem"
        result = ngram_precision(reference, candidate, 1)

        # 2 matching words (customer, had) out of 3 candidate words
        assert result == pytest.approx(2/3, abs=0.01)

    def test_bigram_precision(self):
        """Bigram precision should count phrase matches"""
        reference = "customer had an issue"
        candidate = "customer had problem"
        result = ngram_precision(reference, candidate, 2)

        # 1 matching bigram (customer had) out of 2 candidate bigrams
        assert result == pytest.approx(0.5, abs=0.01)

    def test_empty_candidate(self):
        """Empty candidate should return 0"""
        result = ngram_precision("some text", "", 1)
        assert result == 0.0


class TestBleuScore:
    """Tests for BLEU score"""

    def test_identical_texts(self):
        """Identical texts should have BLEU near 1.0"""
        text = "customer had password issue resolved"
        result = bleu_score(text, text)
        assert result >= 0.95

    def test_partial_overlap(self):
        """Partial overlap should give moderate BLEU"""
        reference = "customer had password issue resolved"
        candidate = "customer password problem fixed"
        result = bleu_score(reference, candidate)
        assert 0.2 < result < 0.7

    def test_no_overlap(self):
        """No overlap should give BLEU of 0"""
        reference = "customer service call"
        candidate = "weather forecast today"
        result = bleu_score(reference, candidate)
        assert result == 0.0
