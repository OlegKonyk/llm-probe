/**
 * Text Similarity Metrics for LLM Output Evaluation
 *
 * This module implements 8 different similarity metrics for evaluating
 * LLM-generated summaries against reference/golden summaries.
 *
 * Why Multiple Metrics?
 * No single metric perfectly captures semantic similarity. Each metric
 * measures different aspects:
 * - Cosine Similarity: Word frequency similarity (bag-of-words)
 * - Jaccard Similarity: Vocabulary overlap (set intersection)
 * - Overlap Coefficient: Lenient similarity for different lengths
 * - Composite Similarity: Weighted combination of the above three
 * - BLEU Score: N-gram precision (borrowed from machine translation)
 * - N-gram Precision: Building block for BLEU
 * - Required Terms: Keyword coverage validation
 * - Length Validation: Word count constraints
 *
 * Key Insight: LLM outputs are non-deterministic, so we use probabilistic
 * evaluation with similarity thresholds (typically 0.80+) instead of exact
 * string matching.
 *
 * Used By:
 * - SummaryEvaluator: Combines metrics for comprehensive quality assessment
 * - Component Tests: Validates semantic equivalence
 * - Regression Tests: Detects quality degradation over time
 */

/**
 * Composite Similarity Weights
 *
 * These weights define how different similarity metrics are combined
 * into a single composite score. Weights are tuned based on empirical
 * testing with the golden dataset.
 *
 * Rationale:
 * - Cosine (50%): Primary metric, captures word frequency importance
 * - Jaccard (30%): Secondary validation of vocabulary overlap
 * - Overlap (20%): Compensates for length differences
 *
 * Total must equal 1.0 (100%)
 */
export const SIMILARITY_WEIGHTS = {
  COSINE: 0.5,   // 50% weight for cosine similarity
  JACCARD: 0.3,  // 30% weight for Jaccard similarity
  OVERLAP: 0.2,  // 20% weight for overlap coefficient
} as const;

/**
 * Cosine Similarity
 *
 * Measures similarity between two texts based on word frequency vectors.
 * Treats each text as a vector in high-dimensional space and calculates
 * the cosine of the angle between them.
 *
 * How It Works:
 * 1. Tokenize both texts into words
 * 2. Build a common vocabulary (union of all words)
 * 3. Create frequency vectors for each text
 * 4. Calculate dot product and magnitudes
 * 5. Return cosine = dot_product / (magnitude1 * magnitude2)
 *
 * Range: 0.0 to 1.0
 * - 0.0: Completely different (no words in common)
 * - 1.0: Identical word frequencies
 * - 0.8+: Strong semantic similarity (typical threshold)
 *
 * Pros:
 * - Fast and lightweight (no ML models required)
 * - Good for comparing texts of different lengths
 * - Captures word importance through frequency
 *
 * Cons:
 * - Ignores word order ("cat bites dog" vs "dog bites cat")
 * - No semantic understanding (synonyms treated as different)
 * - Sensitive to word choice
 *
 * @param text1 - First text to compare
 * @param text2 - Second text to compare
 * @returns Similarity score between 0.0 and 1.0
 *
 * @example
 * cosineSimilarity(
 *   "The customer had an issue",
 *   "Customer experienced a problem"
 * ); // Returns ~0.5 (some overlap but different words)
 */
export function cosineSimilarity(text1: string, text2: string): number {
  const words1 = tokenize(text1);
  const words2 = tokenize(text2);

  // Build vocabulary: union of all unique words from both texts
  const vocab = new Set([...words1, ...words2]);

  // Create word frequency maps (O(n) optimization)
  // Build frequency maps in a single pass instead of filtering for each word
  const freq1 = new Map<string, number>();
  const freq2 = new Map<string, number>();

  for (const word of words1) {
    freq1.set(word, (freq1.get(word) || 0) + 1);
  }
  for (const word of words2) {
    freq2.set(word, (freq2.get(word) || 0) + 1);
  }

  // Create word frequency vectors from frequency maps
  const vec1 = Array.from(vocab).map((word) => freq1.get(word) || 0);
  const vec2 = Array.from(vocab).map((word) => freq2.get(word) || 0);

  // Calculate cosine similarity using vector math
  const dotProduct = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
  const mag1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
  const mag2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));

  // Handle edge case: empty text has zero magnitude
  if (mag1 === 0 || mag2 === 0) return 0;

  return dotProduct / (mag1 * mag2);
}

/**
 * Jaccard Similarity
 *
 * Measures vocabulary overlap as intersection-over-union of word sets.
 * Treats texts as sets of unique words (frequency doesn't matter).
 *
 * Formula: |A ∩ B| / |A ∪ B|
 * - A ∩ B: words appearing in both texts
 * - A ∪ B: all unique words from both texts
 *
 * Range: 0.0 to 1.0
 * - 0.0: No words in common
 * - 1.0: Identical word sets
 * - 0.3-0.5: Typical for similar summaries
 *
 * Pros:
 * - Simple and intuitive (set theory)
 * - Good for comparing vocabulary coverage
 * - Less sensitive to word frequency than cosine
 *
 * Cons:
 * - Penalizes length differences (union gets large)
 * - Ignores word frequency (all words equal weight)
 * - No word order consideration
 *
 * @param text1 - First text to compare
 * @param text2 - Second text to compare
 * @returns Jaccard similarity coefficient (0.0 to 1.0)
 *
 * @example
 * jaccardSimilarity(
 *   "customer issue resolved",
 *   "customer problem fixed"
 * ); // Returns 0.2 (1 common word / 5 unique words)
 */
export function jaccardSimilarity(text1: string, text2: string): number {
  const words1 = new Set(tokenize(text1));
  const words2 = new Set(tokenize(text2));

  // Intersection: words appearing in both sets
  const intersection = new Set(
    Array.from(words1).filter((word) => words2.has(word))
  );

  // Union: all unique words from both sets
  const union = new Set([...words1, ...words2]);

  // Handle edge case: both texts empty
  if (union.size === 0) return 0;

  return intersection.size / union.size;
}

/**
 * Overlap Coefficient (Szymkiewicz–Simpson Coefficient)
 *
 * More lenient similarity metric for texts of different lengths.
 * Normalizes by the smaller set size instead of the union.
 *
 * Formula: |A ∩ B| / min(|A|, |B|)
 * - Measures what % of the shorter text is covered by the longer text
 * - Always >= Jaccard similarity for the same texts
 *
 * Range: 0.0 to 1.0
 * - 0.0: No words in common
 * - 1.0: One text is a subset of the other
 * - 0.6-0.8: Typical for similar summaries of different lengths
 *
 * Use Cases:
 * - Comparing short summary to long summary
 * - When one text is a condensed version of another
 * - Less sensitive to verbosity differences
 *
 * Pros:
 * - Fair comparison for different text lengths
 * - Higher scores than Jaccard (more forgiving)
 * - Good for summarization (naturally length-variable)
 *
 * Cons:
 * - Can give high scores when short text has high overlap
 * - Still ignores word frequency and order
 *
 * @param text1 - First text to compare
 * @param text2 - Second text to compare
 * @returns Overlap coefficient (0.0 to 1.0)
 *
 * @example
 * overlapCoefficient(
 *   "customer issue",  // 2 words
 *   "customer had an issue with account"  // 6 words
 * ); // Returns 1.0 (both words from shorter text appear in longer)
 */
export function overlapCoefficient(text1: string, text2: string): number {
  const words1 = new Set(tokenize(text1));
  const words2 = new Set(tokenize(text2));

  // Intersection: words appearing in both sets
  const intersection = new Set(
    Array.from(words1).filter((word) => words2.has(word))
  );

  // Normalize by the smaller set (more lenient than union)
  const minSize = Math.min(words1.size, words2.size);

  // Handle edge case: at least one text is empty
  if (minSize === 0) return 0;

  return intersection.size / minSize;
}

/**
 * Composite Similarity Score
 *
 * Combines multiple similarity metrics into a single weighted score.
 * This provides a more robust evaluation than any single metric alone.
 *
 * Formula: WEIGHTS.COSINE * cosine + WEIGHTS.JACCARD * jaccard + WEIGHTS.OVERLAP * overlap
 * See SIMILARITY_WEIGHTS constant for current weight values.
 *
 * Weighting Rationale:
 * - Cosine (50%): Captures word frequency importance
 * - Jaccard (30%): Validates vocabulary overlap
 * - Overlap (20%): Accounts for length differences
 *
 * Range: 0.0 to 1.0
 * - This is the PRIMARY metric used for quality evaluation
 * - Threshold for passing: typically 0.80+ (80% similarity)
 * - 0.60-0.79: Borderline (may need review)
 * - Below 0.60: Likely failed quality check
 *
 * Why Composite?
 * - Single metrics can miss important aspects
 * - Cosine alone ignores vocabulary diversity
 * - Jaccard alone ignores word importance
 * - Combination is more reliable than any one metric
 *
 * @param text1 - First text to compare
 * @param text2 - Second text to compare
 * @returns Weighted composite similarity (0.0 to 1.0)
 *
 * @example
 * compositeSimilarity(
 *   "Customer locked out, password reset, issue resolved",
 *   "Customer had account lockout, reset password, problem fixed"
 * ); // Returns ~0.75 (good semantic similarity despite wording differences)
 */
export function compositeSimilarity(text1: string, text2: string): number {
  const cosine = cosineSimilarity(text1, text2);
  const jaccard = jaccardSimilarity(text1, text2);
  const overlap = overlapCoefficient(text1, text2);

  // Weighted average using predefined constants
  // These weights are tuned based on empirical testing with golden dataset
  return (
    SIMILARITY_WEIGHTS.COSINE * cosine +
    SIMILARITY_WEIGHTS.JACCARD * jaccard +
    SIMILARITY_WEIGHTS.OVERLAP * overlap
  );
}

/**
 * Required Terms Coverage Validation
 *
 * Checks if the generated summary contains all required keywords/terms.
 * Used to ensure critical information is not omitted by the LLM.
 *
 * How It Works:
 * - Case-insensitive substring matching
 * - Returns pass/fail + coverage % + list of missing terms
 * - Empty required terms list = automatic pass
 *
 * Use Cases:
 * - Ensure domain-specific terms are preserved (e.g., "password reset")
 * - Validate key entities are mentioned (e.g., product names)
 * - Compliance requirements (e.g., legal terms must appear)
 *
 * @param text - Text to check for required terms
 * @param requiredTerms - Array of terms that must appear
 * @returns Object with pass/fail, coverage %, and missing terms
 *
 * @example
 * containsRequiredTerms(
 *   "Customer reset password successfully",
 *   ["password", "reset", "customer"]
 * );
 * // Returns: { passed: true, coverage: 1.0, missing: [] }
 *
 * @example
 * containsRequiredTerms(
 *   "Account issue was fixed",
 *   ["password", "reset", "email"]
 * );
 * // Returns: { passed: false, coverage: 0.0, missing: ["password", "reset", "email"] }
 */
export function containsRequiredTerms(
  text: string,
  requiredTerms: string[]
): { passed: boolean; coverage: number; missing: string[] } {
  if (requiredTerms.length === 0) {
    return {
      passed: true,
      coverage: 1.0,
      missing: [],
    };
  }

  const textLower = text.toLowerCase();
  const missing: string[] = [];
  let foundCount = 0;

  for (const term of requiredTerms) {
    const regex = new RegExp(`\\b${term.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
    if (regex.test(textLower)) {
      foundCount++;
    } else {
      missing.push(term);
    }
  }

  return {
    passed: missing.length === 0,
    coverage: foundCount / requiredTerms.length,
    missing,
  };
}

/**
 * Length Validation
 *
 * Validates that text length falls within specified word count boundaries.
 * Used to ensure summaries are appropriately concise.
 *
 * Why Word Count Matters:
 * - Too short: Missing important information
 * - Too long: Not a proper summary (just a paraphrase)
 * - Typical range for summaries: 30-150 words
 *
 * @param text - Text to validate
 * @param minWords - Minimum allowed word count (inclusive)
 * @param maxWords - Maximum allowed word count (inclusive)
 * @returns Object with pass/fail and actual word count
 *
 * @example
 * validateLength("Customer had issue resolved", 3, 10);
 * // Returns: { passed: true, wordCount: 4 }
 *
 * @example
 * validateLength("Issue", 5, 10);
 * // Returns: { passed: false, wordCount: 1 }
 */
export function validateLength(
  text: string,
  minWords: number,
  maxWords: number
): { passed: boolean; wordCount: number } {
  const words = tokenize(text);
  const wordCount = words.length;

  return {
    passed: wordCount >= minWords && wordCount <= maxWords,  // Inclusive range
    wordCount,                                                // Actual count
  };
}

/**
 * Tokenizer
 *
 * Converts text into an array of normalized word tokens.
 * This is the foundation for all text comparison metrics.
 *
 * Normalization Steps:
 * 1. Convert to lowercase (case-insensitive matching)
 * 2. Remove punctuation (only keep alphanumeric and spaces)
 * 3. Split on whitespace
 * 4. Filter out empty strings
 *
 * Examples:
 * - "Hello, world!" → ["hello", "world"]
 * - "Customer's account" → ["customer", "s", "account"]
 * - "  Multiple   spaces  " → ["multiple", "spaces"]
 *
 * Limitations:
 * - No stemming (e.g., "running" ≠ "run")
 * - No stop word removal (e.g., "the", "a", "is" included)
 * - No compound word handling (e.g., "e-mail" → ["e", "mail"])
 *
 * For production, consider using a proper NLP tokenizer like:
 * - natural.js WordTokenizer
 * - wink-tokenizer
 * - spaCy (Python)
 *
 * @param text - Text to tokenize
 * @returns Array of lowercase word tokens
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()                      // Normalize case
    .replace(/[^\w\s]/g, ' ')           // Remove punctuation (replace with space)
    .split(/\s+/)                       // Split on any whitespace
    .filter((word) => word.length > 0); // Remove empty strings
}

/**
 * N-gram Precision
 *
 * Calculates what percentage of n-grams from the candidate text
 * appear in the reference text. This is a building block for BLEU score.
 *
 * N-grams:
 * - 1-gram (unigram): individual words
 * - 2-gram (bigram): word pairs
 * - 3-gram (trigram): word triplets
 *
 * Formula: (matching n-grams) / (total candidate n-grams)
 *
 * Example with bigrams (n=2):
 * - Reference: "customer had an issue"
 * - Candidate: "customer had problem"
 * - Reference bigrams: ["customer had", "had an", "an issue"]
 * - Candidate bigrams: ["customer had", "had problem"]
 * - Matches: 1 ("customer had")
 * - Precision: 1/2 = 0.5
 *
 * @param reference - Reference/golden text
 * @param candidate - Generated text to evaluate
 * @param n - N-gram size (default: 1 for unigrams)
 * @returns Precision score (0.0 to 1.0)
 *
 * @example
 * ngramPrecision("customer had issue", "customer had problem", 2);
 * // Returns 0.5 (1 matching bigram out of 2 candidate bigrams)
 */
export function ngramPrecision(
  reference: string,
  candidate: string,
  n: number = 1
): number {
  const refNgrams = getNgrams(tokenize(reference), n);
  const candNgrams = getNgrams(tokenize(candidate), n);

  // Edge case: no n-grams in candidate (text too short)
  if (candNgrams.length === 0) return 0;

  let matches = 0;
  const refCounts = countNgrams(refNgrams);

  // For each candidate n-gram, check if it exists in reference
  // Decrement count after each match (prevents counting same n-gram twice)
  for (const ngram of candNgrams) {
    const key = ngram.join(' ');
    if (refCounts[key] && refCounts[key] > 0) {
      matches++;
      refCounts[key]--;  // Use up this match
    }
  }

  return matches / candNgrams.length;
}

/**
 * BLEU Score (Simplified)
 *
 * Bilingual Evaluation Understudy - originally designed for machine translation,
 * adapted here for summarization quality assessment.
 *
 * This is a simplified version that averages unigram and bigram precision.
 * The full BLEU score includes:
 * - Precision for n-grams up to n=4
 * - Brevity penalty (penalizes too-short outputs)
 * - Geometric mean instead of arithmetic mean
 *
 * Why BLEU for Summarization?
 * - Measures how much of the generated text appears in the reference
 * - Considers both individual words and phrases (unigrams + bigrams)
 * - Correlates with human judgment of summary quality
 *
 * Range: 0.0 to 1.0
 * - 0.0: No n-gram overlap
 * - 1.0: Perfect match
 * - 0.4-0.6: Typical for good summaries (word choices differ)
 *
 * Limitations:
 * - Doesn't capture semantic similarity (synonyms penalized)
 * - Can't detect meaning preservation if wording changes
 * - Best used alongside semantic similarity metrics
 *
 * @param reference - Reference/golden summary
 * @param candidate - Generated summary to evaluate
 * @returns BLEU score (0.0 to 1.0)
 *
 * @example
 * bleuScore(
 *   "customer had password issue resolved",
 *   "customer password problem fixed"
 * ); // Returns ~0.3-0.4 (some word overlap but different phrasing)
 */
export function bleuScore(reference: string, candidate: string): number {
  const p1 = ngramPrecision(reference, candidate, 1);  // Unigram precision
  const p2 = ngramPrecision(reference, candidate, 2);  // Bigram precision

  // Simplified: just average the two precisions
  // Full BLEU would use geometric mean and include brevity penalty
  return (p1 + p2) / 2;
}

/**
 * Extract N-grams from Token Array
 *
 * Converts a list of tokens into overlapping n-grams.
 *
 * @param tokens - Array of word tokens
 * @param n - Size of n-grams to extract
 * @returns Array of n-grams (each n-gram is an array of n tokens)
 *
 * @example
 * getNgrams(["customer", "had", "issue"], 2);
 * // Returns: [["customer", "had"], ["had", "issue"]]
 *
 * @example
 * getNgrams(["a", "b", "c", "d"], 3);
 * // Returns: [["a", "b", "c"], ["b", "c", "d"]]
 */
function getNgrams(tokens: string[], n: number): string[][] {
  const ngrams: string[][] = [];

  // Sliding window approach: extract all consecutive n-token sequences
  for (let i = 0; i <= tokens.length - n; i++) {
    ngrams.push(tokens.slice(i, i + n));
  }

  return ngrams;
}

/**
 * Count N-gram Occurrences
 *
 * Builds a frequency map of n-grams. Used by ngramPrecision to track
 * how many times each n-gram appears in the reference text.
 *
 * This prevents double-counting: if a bigram appears twice in the reference,
 * we allow it to match twice in the candidate, but no more.
 *
 * @param ngrams - Array of n-grams to count
 * @returns Frequency map (n-gram string → count)
 *
 * @example
 * countNgrams([["customer", "issue"], ["customer", "issue"], ["issue", "fixed"]]);
 * // Returns: { "customer issue": 2, "issue fixed": 1 }
 */
function countNgrams(ngrams: string[][]): Record<string, number> {
  const counts: Record<string, number> = {};

  // Convert each n-gram to a space-joined string key
  for (const ngram of ngrams) {
    const key = ngram.join(' ');
    counts[key] = (counts[key] || 0) + 1;
  }

  return counts;
}
