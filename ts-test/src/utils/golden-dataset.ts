import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class GoldenDatasetValidationError extends Error {
  constructor(message: string, public readonly details?: Record<string, unknown>) {
    super(message);
    this.name = 'GoldenDatasetValidationError';
  }
}

export interface GoldenTestCase {
  id: string;
  category: string;
  difficulty: string;
  transcript: string;
  golden_summary: string;
  metadata: {
    sentiment: string;
    resolution_status: string;
    key_points: string[];
  };
  thresholds: {
    min_semantic_similarity: number;
    min_length_words: number;
    max_length_words: number;
    required_terms: string[];
  };
}

export interface GoldenDatasetIndex {
  dataset_version: string;
  last_updated: string;
  total_cases: number;
  categories: Record<string, number>;
  difficulty_distribution: Record<string, number>;
  test_cases: Array<{
    id: string;
    file: string;
    category: string;
    difficulty: string;
  }>;
}

export class GoldenDatasetLoader {
  private datasetPath: string;
  private indexCache: GoldenDatasetIndex | null = null;
  private testCaseMap: Map<string, { file: string; category: string; difficulty: string }> | null = null;

  constructor() {
    this.datasetPath = join(__dirname, '../../../golden-dataset');
  }

  private validateIndex(index: unknown): asserts index is GoldenDatasetIndex {
    if (!index || typeof index !== 'object') {
      throw new GoldenDatasetValidationError('Index is not an object');
    }

    const idx = index as Record<string, unknown>;

    const requiredFields = ['dataset_version', 'last_updated', 'total_cases', 'categories', 'difficulty_distribution', 'test_cases'];
    for (const field of requiredFields) {
      if (!(field in idx)) {
        throw new GoldenDatasetValidationError(`Missing required field: ${field}`);
      }
    }

    if (typeof idx.dataset_version !== 'string') {
      throw new GoldenDatasetValidationError('dataset_version must be a string');
    }

    if (typeof idx.last_updated !== 'string') {
      throw new GoldenDatasetValidationError('last_updated must be a string');
    }

    if (typeof idx.total_cases !== 'number') {
      throw new GoldenDatasetValidationError('total_cases must be a number');
    }

    if (!idx.categories || typeof idx.categories !== 'object') {
      throw new GoldenDatasetValidationError('categories must be an object');
    }

    if (!idx.difficulty_distribution || typeof idx.difficulty_distribution !== 'object') {
      throw new GoldenDatasetValidationError('difficulty_distribution must be an object');
    }

    if (!Array.isArray(idx.test_cases)) {
      throw new GoldenDatasetValidationError('test_cases must be an array');
    }

    if (idx.total_cases !== idx.test_cases.length) {
      throw new GoldenDatasetValidationError(
        `total_cases (${idx.total_cases}) does not match test_cases array length (${idx.test_cases.length})`
      );
    }

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

    if (typeof thresholds.min_semantic_similarity !== 'number' ||
        thresholds.min_semantic_similarity < 0 || thresholds.min_semantic_similarity > 1) {
      throw new GoldenDatasetValidationError(
        'min_semantic_similarity must be a number between 0 and 1',
        { id: tc.id, value: thresholds.min_semantic_similarity }
      );
    }

    if (typeof thresholds.min_length_words !== 'number' || thresholds.min_length_words < 0) {
      throw new GoldenDatasetValidationError(
        'min_length_words must be a non-negative number',
        { id: tc.id, value: thresholds.min_length_words }
      );
    }

    if (typeof thresholds.max_length_words !== 'number' || thresholds.max_length_words < thresholds.min_length_words) {
      throw new GoldenDatasetValidationError(
        'max_length_words must be a number greater than or equal to min_length_words',
        { id: tc.id, value: thresholds.max_length_words }
      );
    }

    if (!Array.isArray(thresholds.required_terms)) {
      throw new GoldenDatasetValidationError('required_terms must be an array', { id: tc.id });
    }
  }

  loadIndex(): GoldenDatasetIndex {
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

    let content: string;
    let parsed: unknown;

    try {
      content = readFileSync(indexPath, 'utf-8');
    } catch (error) {
      throw new Error(
        `Failed to read index file at '${indexPath}': ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    try {
      parsed = JSON.parse(content);
    } catch (error) {
      throw new GoldenDatasetValidationError(
        `Invalid JSON in index file: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    this.validateIndex(parsed);
    this.indexCache = parsed;

    this.testCaseMap = new Map();
    for (const tc of parsed.test_cases) {
      this.testCaseMap.set(tc.id, { file: tc.file, category: tc.category, difficulty: tc.difficulty });
    }

    return parsed;
  }

  clearCache(): void {
    this.indexCache = null;
    this.testCaseMap = null;
  }

  loadTestCase(caseId: string): GoldenTestCase {
    this.loadIndex();

    if (!this.testCaseMap) {
      throw new Error('Test case map not initialized');
    }

    const testCaseInfo = this.testCaseMap.get(caseId);

    if (!testCaseInfo) {
      const availableIds = Array.from(this.testCaseMap.keys()).join(', ');
      throw new Error(
        `Test case '${caseId}' not found in index. Available test cases: ${availableIds}`
      );
    }

    const casePath = join(this.datasetPath, testCaseInfo.file);

    if (!existsSync(casePath)) {
      throw new Error(
        `Test case file not found: ${casePath}. ` +
        `Expected file '${testCaseInfo.file}' for test case '${caseId}'.`
      );
    }

    let content: string;
    try {
      content = readFileSync(casePath, 'utf-8');
    } catch (error) {
      throw new Error(
        `Failed to read test case file '${testCaseInfo.file}': ` +
        `${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch (error) {
      throw new GoldenDatasetValidationError(
        `Invalid JSON in test case file '${testCaseInfo.file}': ` +
        `${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    this.validateTestCase(parsed);

    return parsed;
  }

  loadAllTestCases(): GoldenTestCase[] {
    const index = this.loadIndex();
    return index.test_cases.map((tc) => this.loadTestCase(tc.id));
  }

  loadByCategory(category: string): GoldenTestCase[] {
    const index = this.loadIndex();
    return index.test_cases
      .filter((tc) => tc.category === category)
      .map((tc) => this.loadTestCase(tc.id));
  }

  loadByDifficulty(difficulty: string): GoldenTestCase[] {
    const index = this.loadIndex();
    return index.test_cases
      .filter((tc) => tc.difficulty === difficulty)
      .map((tc) => this.loadTestCase(tc.id));
  }
}
