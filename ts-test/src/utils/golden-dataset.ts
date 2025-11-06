/**
 * Golden Dataset Loader
 *
 * Loads and manages the golden dataset - a curated collection of
 * call transcripts with human-written reference summaries.
 *
 * What is a Golden Dataset?
 * A golden dataset is a set of high-quality, human-validated test cases
 * used for:
 * - Regression testing (detect quality degradation)
 * - Benchmark evaluation (measure LLM performance)
 * - Baseline establishment (set quality thresholds)
 * - Edge case coverage (difficult scenarios)
 *
 * Dataset Structure:
 * - golden-dataset/index.json - Metadata and file references
 * - golden-dataset/sample-*.json - Individual test cases
 *
 * Each test case includes:
 * - id: Unique identifier (e.g., "call_001")
 * - category: Type of support issue (e.g., "password_reset")
 * - difficulty: Complexity level ("easy", "medium", "hard")
 * - transcript: Full call transcript (input to LLM)
 * - golden_summary: Human-written reference summary (expected output)
 * - metadata: Additional context (sentiment, resolution, key points)
 * - thresholds: Quality criteria (similarity, length, required terms)
 *
 * Used By:
 * - Component tests: Validate quality for specific categories
 * - Regression tests: Monitor quality over time
 * - Property-based tests: Test invariants across all cases
 * - Manual validation: Compare LLM output to references
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// ESM module path resolution (needed for __dirname equivalent)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Validation Error for Golden Dataset
 */
export class GoldenDatasetValidationError extends Error {
  constructor(message: string, public readonly details?: Record<string, unknown>) {
    super(message);
    this.name = 'GoldenDatasetValidationError';
  }
}

/**
 * Golden Test Case Interface
 *
 * Structure of a single test case in the golden dataset.
 * Each test case represents one customer support call with its
 * expected summary and quality thresholds.
 */
export interface GoldenTestCase {
  id: string;                   // Unique ID (e.g., "call_001")
  category: string;             // Issue type (e.g., "password_reset")
  difficulty: string;           // Complexity ("easy", "medium", "hard")
  transcript: string;           // Full call transcript (LLM input)
  golden_summary: string;       // Human-written reference summary
  metadata: {
    sentiment: string;          // Overall sentiment ("positive", "neutral", "negative")
    resolution_status: string;  // Was issue resolved? ("resolved", "unresolved", "escalated")
    key_points: string[];       // Main takeaways from the call
  };
  thresholds: {
    min_semantic_similarity: number;  // Min similarity score to pass (typically 0.80)
    min_length_words: number;         // Min words in summary
    max_length_words: number;         // Max words in summary
    required_terms: string[];         // Keywords that must appear in summary
  };
}

/**
 * Golden Dataset Index Interface
 *
 * Structure of the index.json file that catalogs all test cases.
 * Provides metadata and quick lookups without loading all files.
 */
export interface GoldenDatasetIndex {
  dataset_version: string;                    // Version (e.g., "1.0.0")
  last_updated: string;                       // ISO8601 timestamp
  total_cases: number;                        // Total number of test cases
  categories: Record<string, number>;         // Count per category
  difficulty_distribution: Record<string, number>;  // Count per difficulty
  test_cases: Array<{
    id: string;                               // Test case ID
    file: string;                             // Filename (e.g., "sample-001.json")
    category: string;                         // Category for filtering
    difficulty: string;                       // Difficulty for filtering
  }>;
}

export class GoldenDatasetLoader {
  private datasetPath: string;
  private indexCache: GoldenDatasetIndex | null = null;

  /**
   * Creates a new GoldenDatasetLoader
   *
   * Automatically locates the golden-dataset directory relative to
   * this source file location.
   *
   * Directory structure:
   * - ts-test/src/utils/golden-dataset.ts (this file)
   * - golden-dataset/ (target directory, 3 levels up)
   */
  constructor() {
    // Navigate from ts-test/src/utils to golden-dataset
    // Path: ./src/utils -> ./src -> ./ -> ../golden-dataset
    this.datasetPath = join(__dirname, '../../../golden-dataset');
  }

  /**
   * Validate Golden Dataset Index
   *
   * Validates that the index object has all required fields and correct types.
   *
   * @param index - The parsed index object to validate
   * @throws GoldenDatasetValidationError if validation fails
   */
  private validateIndex(index: unknown): asserts index is GoldenDatasetIndex {
    if (!index || typeof index !== 'object') {
      throw new GoldenDatasetValidationError('Index is not an object');
    }

    const idx = index as Record<string, unknown>;

    // Check required fields
    const requiredFields = ['dataset_version', 'last_updated', 'total_cases', 'categories', 'test_cases'];
    for (const field of requiredFields) {
      if (!(field in idx)) {
        throw new GoldenDatasetValidationError(`Missing required field: ${field}`);
      }
    }

    // Validate test_cases is an array
    if (!Array.isArray(idx.test_cases)) {
      throw new GoldenDatasetValidationError('test_cases must be an array');
    }

    // Validate each test case entry
    for (const tc of idx.test_cases) {
      if (!tc || typeof tc !== 'object') {
        throw new GoldenDatasetValidationError('Invalid test case entry in index');
      }
      const testCase = tc as Record<string, unknown>;
      if (!testCase.id || !testCase.file || !testCase.category || !testCase.difficulty) {
        throw new GoldenDatasetValidationError(
          'Test case entry missing required fields (id, file, category, difficulty)',
          { testCase }
        );
      }
    }
  }

  /**
   * Validate Golden Test Case
   *
   * Validates that a test case object has all required fields and correct types.
   *
   * @param testCase - The parsed test case object to validate
   * @throws GoldenDatasetValidationError if validation fails
   */
  private validateTestCase(testCase: unknown): asserts testCase is GoldenTestCase {
    if (!testCase || typeof testCase !== 'object') {
      throw new GoldenDatasetValidationError('Test case is not an object');
    }

    const tc = testCase as Record<string, unknown>;

    // Check required top-level fields
    const requiredFields = ['id', 'category', 'difficulty', 'transcript', 'golden_summary', 'metadata', 'thresholds'];
    for (const field of requiredFields) {
      if (!(field in tc)) {
        throw new GoldenDatasetValidationError(`Missing required field: ${field}`, { id: tc.id });
      }
    }

    // Validate transcript and golden_summary are non-empty strings
    if (typeof tc.transcript !== 'string' || tc.transcript.trim().length === 0) {
      throw new GoldenDatasetValidationError('transcript must be a non-empty string', { id: tc.id });
    }
    if (typeof tc.golden_summary !== 'string' || tc.golden_summary.trim().length === 0) {
      throw new GoldenDatasetValidationError('golden_summary must be a non-empty string', { id: tc.id });
    }

    // Validate metadata object
    if (!tc.metadata || typeof tc.metadata !== 'object') {
      throw new GoldenDatasetValidationError('metadata must be an object', { id: tc.id });
    }

    // Validate thresholds object
    if (!tc.thresholds || typeof tc.thresholds !== 'object') {
      throw new GoldenDatasetValidationError('thresholds must be an object', { id: tc.id });
    }

    const thresholds = tc.thresholds as Record<string, unknown>;
    const requiredThresholds = ['min_semantic_similarity', 'min_length_words', 'max_length_words', 'required_terms'];
    for (const field of requiredThresholds) {
      if (!(field in thresholds)) {
        throw new GoldenDatasetValidationError(`Missing threshold field: ${field}`, { id: tc.id });
      }
    }

    // Validate threshold types
    if (typeof thresholds.min_semantic_similarity !== 'number' ||
        thresholds.min_semantic_similarity < 0 || thresholds.min_semantic_similarity > 1) {
      throw new GoldenDatasetValidationError(
        'min_semantic_similarity must be a number between 0 and 1',
        { id: tc.id, value: thresholds.min_semantic_similarity }
      );
    }

    if (!Array.isArray(thresholds.required_terms)) {
      throw new GoldenDatasetValidationError('required_terms must be an array', { id: tc.id });
    }
  }

  /**
   * Load Dataset Index
   *
   * Reads the index.json file containing metadata about all test cases.
   * This provides a quick overview without loading individual files.
   *
   * @returns Dataset index with metadata and file references
   * @throws Error if index.json is not found or invalid
   * @throws GoldenDatasetValidationError if index structure is invalid
   *
   * @example
   * const index = loader.loadIndex();
   * console.log(`Total cases: ${index.total_cases}`);
   * console.log(`Categories:`, index.categories);
   */
  loadIndex(): GoldenDatasetIndex {
    // Return cached index if available (performance optimization)
    if (this.indexCache) {
      return this.indexCache;
    }

    const indexPath = join(this.datasetPath, 'index.json');

    // Check if file exists
    if (!existsSync(indexPath)) {
      throw new Error(
        `Golden dataset index not found at ${indexPath}. ` +
        `Please ensure the golden-dataset directory exists with index.json file.`
      );
    }

    // Read and parse
    let content: string;
    let parsed: unknown;

    try {
      content = readFileSync(indexPath, 'utf-8');
    } catch (error) {
      throw new Error(
        `Failed to read index file: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    try {
      parsed = JSON.parse(content);
    } catch (error) {
      throw new GoldenDatasetValidationError(
        `Invalid JSON in index file: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    // Validate structure
    this.validateIndex(parsed);

    // Cache for future use
    this.indexCache = parsed;

    return parsed;
  }

  /**
   * Clear Index Cache
   *
   * Clears the in-memory cache of the dataset index. Next call to loadIndex()
   * will reload from disk. Useful when index file is updated externally.
   *
   * @example
   * loader.clearCache();  // Force reload on next loadIndex() call
   */
  clearCache(): void {
    this.indexCache = null;
  }

  /**
   * Load Single Test Case
   *
   * Loads a specific test case by its ID from the golden dataset.
   *
   * Workflow:
   * 1. Load index to find filename for this ID
   * 2. Check if test case file exists
   * 3. Read the test case file
   * 4. Parse and validate the test case object
   *
   * @param caseId - Test case ID (e.g., "call_001")
   * @returns Test case with transcript, golden summary, and thresholds
   * @throws Error if test case ID is not found in index or file doesn't exist
   * @throws GoldenDatasetValidationError if test case structure is invalid
   *
   * @example
   * const testCase = loader.loadTestCase('call_001');
   * console.log(testCase.category); // "password_reset"
   * console.log(testCase.golden_summary); // "Customer was locked out..."
   */
  loadTestCase(caseId: string): GoldenTestCase {
    // Look up the test case in the index
    const index = this.loadIndex();
    const testCaseInfo = index.test_cases.find((tc) => tc.id === caseId);

    if (!testCaseInfo) {
      const availableIds = index.test_cases.map(tc => tc.id).join(', ');
      throw new Error(
        `Test case '${caseId}' not found in index. Available test cases: ${availableIds}`
      );
    }

    // Load and parse the test case file
    const casePath = join(this.datasetPath, testCaseInfo.file);

    // Check if file exists
    if (!existsSync(casePath)) {
      throw new Error(
        `Test case file not found: ${casePath}. ` +
        `Expected file '${testCaseInfo.file}' for test case '${caseId}'.`
      );
    }

    // Read file
    let content: string;
    try {
      content = readFileSync(casePath, 'utf-8');
    } catch (error) {
      throw new Error(
        `Failed to read test case file '${testCaseInfo.file}': ` +
        `${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    // Parse JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch (error) {
      throw new GoldenDatasetValidationError(
        `Invalid JSON in test case file '${testCaseInfo.file}': ` +
        `${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    // Validate structure
    this.validateTestCase(parsed);

    return parsed;
  }

  /**
   * Load All Test Cases
   *
   * Loads every test case in the golden dataset.
   * This is used for comprehensive regression testing and benchmarking.
   *
   * Note: For large datasets, this may be slow. Consider loading
   * cases on-demand or filtering by category/difficulty.
   *
   * @returns Array of all test cases in the dataset
   *
   * @example
   * const allCases = loader.loadAllTestCases();
   * console.log(`Loaded ${allCases.length} test cases`);
   * allCases.forEach(tc => console.log(`${tc.id}: ${tc.category}`));
   */
  loadAllTestCases(): GoldenTestCase[] {
    const index = this.loadIndex();
    return index.test_cases.map((tc) => this.loadTestCase(tc.id));
  }

  /**
   * Load Test Cases by Category
   *
   * Loads all test cases for a specific category (e.g., "password_reset").
   * Useful for category-specific quality validation.
   *
   * Categories in the dataset:
   * - password_reset: Account access issues
   * - billing_inquiry: Payment and charges
   * - product_issue: Defective or broken products
   * - account_update: Profile/settings changes
   * - general_inquiry: Information requests
   *
   * @param category - Category to filter by
   * @returns Array of test cases in that category
   *
   * @example
   * const passwordCases = loader.loadByCategory('password_reset');
   * console.log(`${passwordCases.length} password reset test cases`);
   */
  loadByCategory(category: string): GoldenTestCase[] {
    const index = this.loadIndex();
    return index.test_cases
      .filter((tc) => tc.category === category)
      .map((tc) => this.loadTestCase(tc.id));
  }

  /**
   * Load Test Cases by Difficulty
   *
   * Loads all test cases for a specific difficulty level.
   * Useful for testing LLM performance on edge cases.
   *
   * Difficulty Levels:
   * - easy: Straightforward, single-issue calls
   * - medium: Multiple issues or clarifications needed
   * - hard: Complex scenarios, multiple resolutions, edge cases
   *
   * @param difficulty - Difficulty level to filter by
   * @returns Array of test cases at that difficulty
   *
   * @example
   * const hardCases = loader.loadByDifficulty('hard');
   * console.log(`${hardCases.length} hard test cases`);
   */
  loadByDifficulty(difficulty: string): GoldenTestCase[] {
    const index = this.loadIndex();
    return index.test_cases
      .filter((tc) => tc.difficulty === difficulty)
      .map((tc) => this.loadTestCase(tc.id));
  }
}
