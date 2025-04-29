"""
Text Similarity Metrics for LLM Output Evaluation

This module implements 8 different similarity metrics for evaluating
LLM-generated summaries against reference/golden summaries.

Why Multiple Metrics?
No single metric perfectly captures semantic similarity. Each metric
measures different aspects:
- Cosine Similarity: Word frequency similarity (bag-of-words)
- Jaccard Similarity: Vocabulary overlap (set intersection)
- Overlap Coefficient: Lenient similarity for different lengths
- Composite Similarity: Weighted combination of the above three
- BLEU Score: N-gram precision (borrowed from machine translation)
- N-gram Precision: Building block for BLEU
- Required Terms: Keyword coverage validation
- Length Validation: Word count constraints

Key Insight: LLM outputs are non-deterministic, so we use probabilistic
evaluation with similarity thresholds (typically 0.80+) instead of exact
string matching.

Used By:
- SummaryEvaluator: Combines metrics for comprehensive quality assessment
- Component Tests: Validates semantic equivalence
- Regression Tests: Detects quality degradation over time
"""

import math
import re
from collections import Counter
from typing import Any


def cosine_similarity(text1: str, text2: str) -> float:
    """
    Cosine Similarity

    Measures similarity between two texts based on word frequency vectors.
    Treats each text as a vector in high-dimensional space and calculates
    the cosine of the angle between them.

    How It Works:
    1. Tokenize both texts into words
    2. Build a common vocabulary (union of all words)
    3. Create frequency vectors for each text
    4. Calculate dot product and magnitudes
    5. Return cosine = dot_product / (magnitude1 * magnitude2)

    Range: 0.0 to 1.0
    - 0.0: Completely different (no words in common)
    - 1.0: Identical word frequencies
    - 0.8+: Strong semantic similarity (typical threshold)

    Pros:
    - Fast and lightweight (no ML models required)
    - Good for comparing texts of different lengths
    - Captures word importance through frequency

    Cons:
    - Ignores word order ("cat bites dog" vs "dog bites cat")
    - No semantic understanding (synonyms treated as different)
    - Sensitive to word choice

    Args:
        text1: First text to compare
        text2: Second text to compare

    Returns:
        Similarity score between 0.0 and 1.0

    Example:
        >>> cosine_similarity(
        ...     "The customer had an issue",
        ...     "Customer experienced a problem"
        ... )
        0.5  # Approximate - some overlap but different words
    """
    words1 = _tokenize(text1)
    words2 = _tokenize(text2)

    # Build vocabulary: union of all unique words from both texts
    vocab = list(set(words1 + words2))

    # Create word frequency maps using Counter (O(n) instead of O(n²))
    # This avoids calling list.count() in a loop, which rescans the entire list each time
    counter1 = Counter(words1)
    counter2 = Counter(words2)

    # Create word frequency vectors from the counters
    vec1 = [counter1[word] for word in vocab]
    vec2 = [counter2[word] for word in vocab]

    # Calculate cosine similarity using vector math
    dot_product = sum(v1 * v2 for v1, v2 in zip(vec1, vec2))
    mag1 = math.sqrt(sum(v * v for v in vec1))
    mag2 = math.sqrt(sum(v * v for v in vec2))

    # Handle edge case: empty text has zero magnitude
    if mag1 == 0 or mag2 == 0:
        return 0.0

    return dot_product / (mag1 * mag2)


def jaccard_similarity(text1: str, text2: str) -> float:
    """
    Jaccard Similarity

    Measures vocabulary overlap as intersection-over-union of word sets.
    Treats texts as sets of unique words (frequency doesn't matter).

    Formula: |A ∩ B| / |A ∪ B|
    - A ∩ B: words appearing in both texts
    - A ∪ B: all unique words from both texts

    Range: 0.0 to 1.0
    - 0.0: No words in common
    - 1.0: Identical word sets
    - 0.3-0.5: Typical for similar summaries

    Pros:
    - Simple and intuitive (set theory)
    - Good for comparing vocabulary coverage
    - Less sensitive to word frequency than cosine

    Cons:
    - Penalizes length differences (union gets large)
    - Ignores word frequency (all words equal weight)
    - No word order consideration

    Args:
        text1: First text to compare
        text2: Second text to compare

    Returns:
        Jaccard similarity coefficient (0.0 to 1.0)

    Example:
        >>> jaccard_similarity(
        ...     "customer issue resolved",
        ...     "customer problem fixed"
        ... )
        0.2  # 1 common word / 5 unique words
    """
    words1 = set(_tokenize(text1))
    words2 = set(_tokenize(text2))

    # Intersection: words appearing in both sets
    intersection = words1.intersection(words2)

    # Union: all unique words from both sets
    union = words1.union(words2)

    # Handle edge case: both texts empty
    if len(union) == 0:
        return 0.0

    return len(intersection) / len(union)


def overlap_coefficient(text1: str, text2: str) -> float:
    """
    Overlap Coefficient (Szymkiewicz–Simpson Coefficient)

    More lenient similarity metric for texts of different lengths.
    Normalizes by the smaller set size instead of the union.

    Formula: |A ∩ B| / min(|A|, |B|)
    - Measures what % of the shorter text is covered by the longer text
    - Always >= Jaccard similarity for the same texts

    Range: 0.0 to 1.0
    - 0.0: No words in common
    - 1.0: One text is a subset of the other
    - 0.6-0.8: Typical for similar summaries of different lengths

    Use Cases:
    - Comparing short summary to long summary
    - When one text is a condensed version of another
    - Less sensitive to verbosity differences

    Pros:
    - Fair comparison for different text lengths
    - Higher scores than Jaccard (more forgiving)
    - Good for summarization (naturally length-variable)

    Cons:
    - Can give high scores when short text has high overlap
    - Still ignores word frequency and order

    Args:
        text1: First text to compare
        text2: Second text to compare

    Returns:
        Overlap coefficient (0.0 to 1.0)

    Example:
        >>> overlap_coefficient(
        ...     "customer issue",
        ...     "customer had an issue with account"
        ... )
        1.0  # Both words from shorter text appear in longer
    """
    words1 = set(_tokenize(text1))
    words2 = set(_tokenize(text2))

    # Intersection: words appearing in both sets
    intersection = words1.intersection(words2)

    # Normalize by the smaller set (more lenient than union)
    min_size = min(len(words1), len(words2))

    # Handle edge case: at least one text is empty
    if min_size == 0:
        return 0.0

    return len(intersection) / min_size


def composite_similarity(text1: str, text2: str) -> float:
    """
    Composite Similarity Score

    Combines multiple similarity metrics into a single weighted score.
    This provides a more robust evaluation than any single metric alone.

    Formula: 0.5 * cosine + 0.3 * jaccard + 0.2 * overlap

    Weighting Rationale:
    - 50% Cosine: Captures word frequency importance
    - 30% Jaccard: Validates vocabulary overlap
    - 20% Overlap: Accounts for length differences

    Range: 0.0 to 1.0
    - This is the PRIMARY metric used for quality evaluation
    - Threshold for passing: typically 0.80+ (80% similarity)
    - 0.60-0.79: Borderline (may need review)
    - Below 0.60: Likely failed quality check

    Why Composite?
    - Single metrics can miss important aspects
    - Cosine alone ignores vocabulary diversity
    - Jaccard alone ignores word importance
    - Combination is more reliable than any one metric

    Args:
        text1: First text to compare
        text2: Second text to compare

    Returns:
        Weighted composite similarity (0.0 to 1.0)

    Example:
        >>> composite_similarity(
        ...     "Customer locked out, password reset, issue resolved",
        ...     "Customer had account lockout, reset password, problem fixed"
        ... )
        0.75  # Approximate - good semantic similarity despite wording differences
    """
    cosine = cosine_similarity(text1, text2)
    jaccard = jaccard_similarity(text1, text2)
    overlap = overlap_coefficient(text1, text2)

    # Weighted average: cosine is most important for summaries
    # Tuned based on empirical testing with golden dataset
    return 0.5 * cosine + 0.3 * jaccard + 0.2 * overlap


def contains_required_terms(
    text: str,
    required_terms: list[str]
) -> dict[str, Any]:
    """
    Required Terms Coverage Validation

    Checks if the generated summary contains all required keywords/terms.
    Used to ensure critical information is not omitted by the LLM.

    How It Works:
    - Case-insensitive whole word matching (using regex word boundaries)
    - Returns pass/fail + coverage % + list of missing terms
    - Empty required terms list = automatic pass

    Use Cases:
    - Ensure domain-specific terms are preserved (e.g., "password reset")
    - Validate key entities are mentioned (e.g., product names)
    - Compliance requirements (e.g., legal terms must appear)

    Args:
        text: Text to check for required terms
        required_terms: List of terms that must appear

    Returns:
        Dictionary with:
            - passed (bool): Whether all terms were found
            - coverage (float): Percentage of terms found (0.0 to 1.0)
            - missing (List[str]): List of missing terms

    Example:
        >>> contains_required_terms(
        ...     "Customer reset password successfully",
        ...     ["password", "reset", "customer"]
        ... )
        {'passed': True, 'coverage': 1.0, 'missing': []}

        >>> contains_required_terms(
        ...     "Account issue was fixed",
        ...     ["password", "reset", "email"]
        ... )
        {'passed': False, 'coverage': 0.0, 'missing': ['password', 'reset', 'email']}
    """
    # Handle empty required terms: automatic pass
    if len(required_terms) == 0:
        return {
            'passed': True,
            'coverage': 1.0,
            'missing': []
        }

    # Case-insensitive matching with word boundaries
    text_lower = text.lower()

    # Find which required terms are present (whole word match using regex)
    # Use word boundaries (\b) to avoid false positives like "cat" in "caterpillar"
    found = [
        term for term in required_terms
        if re.search(r'\b' + re.escape(term.lower()) + r'\b', text_lower)
    ]

    # Find which required terms are missing
    missing = [
        term for term in required_terms
        if not re.search(r'\b' + re.escape(term.lower()) + r'\b', text_lower)
    ]

    return {
        'passed': len(found) == len(required_terms),
        'coverage': len(found) / len(required_terms),
        'missing': missing
    }


def validate_length(
    text: str,
    min_words: int,
    max_words: int
) -> dict[str, Any]:
    """
    Length Validation

    Validates that text length falls within specified word count boundaries.
    Used to ensure summaries are appropriately concise.

    Why Word Count Matters:
    - Too short: Missing important information
    - Too long: Not a proper summary (just a paraphrase)
    - Typical range for summaries: 30-150 words

    Args:
        text: Text to validate
        min_words: Minimum allowed word count (inclusive)
        max_words: Maximum allowed word count (inclusive)

    Returns:
        Dictionary with:
            - passed (bool): Whether length is in valid range
            - word_count (int): Actual word count

    Raises:
        ValueError: If min_words > max_words or if either is negative

    Example:
        >>> validate_length("Customer had issue resolved", 3, 10)
        {'passed': True, 'word_count': 4}

        >>> validate_length("Issue", 5, 10)
        {'passed': False, 'word_count': 1}
    """
    if min_words < 0 or max_words < 0:
        raise ValueError("Word count limits must be non-negative")
    if min_words > max_words:
        raise ValueError(f"min_words ({min_words}) cannot be greater than max_words ({max_words})")

    words = _tokenize(text)
    word_count = len(words)

    return {
        'passed': min_words <= word_count <= max_words,
        'word_count': word_count
    }


def ngram_precision(
    reference: str,
    candidate: str,
    n: int = 1
) -> float:
    """
    N-gram Precision

    Calculates what percentage of n-grams from the candidate text
    appear in the reference text. This is a building block for BLEU score.

    N-grams:
    - 1-gram (unigram): individual words
    - 2-gram (bigram): word pairs
    - 3-gram (trigram): word triplets

    Formula: (matching n-grams) / (total candidate n-grams)

    Example with bigrams (n=2):
    - Reference: "customer had an issue"
    - Candidate: "customer had problem"
    - Reference bigrams: ["customer had", "had an", "an issue"]
    - Candidate bigrams: ["customer had", "had problem"]
    - Matches: 1 ("customer had")
    - Precision: 1/2 = 0.5

    Args:
        reference: Reference/golden text
        candidate: Generated text to evaluate
        n: N-gram size (default: 1 for unigrams)

    Returns:
        Precision score (0.0 to 1.0)

    Example:
        >>> ngram_precision("customer had issue", "customer had problem", 2)
        0.5  # 1 matching bigram out of 2 candidate bigrams
    """
    ref_ngrams = _get_ngrams(_tokenize(reference), n)
    cand_ngrams = _get_ngrams(_tokenize(candidate), n)

    # Edge case: no n-grams in candidate (text too short)
    if len(cand_ngrams) == 0:
        return 0.0

    matches = 0
    ref_counts = _count_ngrams(ref_ngrams)

    # For each candidate n-gram, check if it exists in reference
    for ngram in cand_ngrams:
        key = ' '.join(ngram)
        if key in ref_counts and ref_counts[key] > 0:
            matches += 1
            ref_counts[key] -= 1  # Use up this match

    return matches / len(cand_ngrams)


def bleu_score(reference: str, candidate: str) -> float:
    """
    BLEU Score (Simplified)

    Bilingual Evaluation Understudy - originally designed for machine translation,
    adapted here for summarization quality assessment.

    This is a simplified version that averages unigram and bigram precision.
    The full BLEU score includes:
    - Precision for n-grams up to n=4
    - Brevity penalty (penalizes too-short outputs)
    - Geometric mean instead of arithmetic mean

    Why BLEU for Summarization?
    - Measures how much of the generated text appears in the reference
    - Considers both individual words and phrases (unigrams + bigrams)
    - Correlates with human judgment of summary quality

    Range: 0.0 to 1.0
    - 0.0: No n-gram overlap
    - 1.0: Perfect match
    - 0.4-0.6: Typical for good summaries (word choices differ)

    Limitations:
    - Doesn't capture semantic similarity (synonyms penalized)
    - Can't detect meaning preservation if wording changes
    - Best used alongside semantic similarity metrics

    Args:
        reference: Reference/golden summary
        candidate: Generated summary to evaluate

    Returns:
        BLEU score (0.0 to 1.0)

    Example:
        >>> bleu_score(
        ...     "customer had password issue resolved",
        ...     "customer password problem fixed"
        ... )
        0.35  # Approximate - some word overlap but different phrasing
    """
    p1 = ngram_precision(reference, candidate, 1)  # Unigram precision
    p2 = ngram_precision(reference, candidate, 2)  # Bigram precision

    # Simplified: just average the two precisions
    # Full BLEU would use geometric mean and include brevity penalty
    return (p1 + p2) / 2


# Private helper functions

def _tokenize(text: str) -> list[str]:
    """
    Tokenizer

    Converts text into a list of normalized word tokens.
    This is the foundation for all text comparison metrics.

    Normalization Steps:
    1. Convert to lowercase (case-insensitive matching)
    2. Remove punctuation (only keep alphanumeric and spaces)
    3. Split on whitespace
    4. Filter out empty strings

    Examples:
    - "Hello, world!" → ["hello", "world"]
    - "Customer's account" → ["customer", "s", "account"]
    - "  Multiple   spaces  " → ["multiple", "spaces"]

    Args:
        text: Text to tokenize

    Returns:
        List of lowercase word tokens
    """
    # Remove punctuation and convert to lowercase
    text = re.sub(r'[^\w\s]', ' ', text.lower())
    # Split on whitespace and filter empty strings
    return [word for word in text.split() if word]


def _get_ngrams(tokens: list[str], n: int) -> list[list[str]]:
    """
    Extract N-grams from Token List

    Converts a list of tokens into overlapping n-grams.

    Args:
        tokens: List of word tokens
        n: Size of n-grams to extract

    Returns:
        List of n-grams (each n-gram is a list of n tokens)

    Example:
        >>> _get_ngrams(["customer", "had", "issue"], 2)
        [["customer", "had"], ["had", "issue"]]
    """
    ngrams = []
    for i in range(len(tokens) - n + 1):
        ngrams.append(tokens[i:i+n])
    return ngrams


def _count_ngrams(ngrams: list[list[str]]) -> dict[str, int]:
    """
    Count N-gram Occurrences

    Builds a frequency map of n-grams.

    Args:
        ngrams: List of n-grams to count

    Returns:
        Frequency map (n-gram string → count)

    Example:
        >>> _count_ngrams([["customer", "issue"], ["customer", "issue"], ["issue", "fixed"]])
        {"customer issue": 2, "issue fixed": 1}
    """
    counts: dict[str, int] = {}
    for ngram in ngrams:
        key = ' '.join(ngram)
        counts[key] = counts.get(key, 0) + 1
    return counts
