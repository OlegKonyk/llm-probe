"""
Golden Dataset Loader

Loads and manages the golden dataset - a curated collection of
call transcripts with human-written reference summaries.

What is a Golden Dataset?
A golden dataset is a set of high-quality, human-validated test cases
used for:
- Regression testing (detect quality degradation)
- Benchmark evaluation (measure LLM performance)
- Baseline establishment (set quality thresholds)
- Edge case coverage (difficult scenarios)

Dataset Structure:
- golden-dataset/index.json - Metadata and file references
- golden-dataset/sample-*.json - Individual test cases

Each test case includes:
- id: Unique identifier (e.g., "call_001")
- category: Type of support issue (e.g., "password_reset")
- difficulty: Complexity level ("easy", "medium", "hard")
- transcript: Full call transcript (input to LLM)
- golden_summary: Human-written reference summary (expected output)
- metadata: Additional context (sentiment, resolution, key points)
- thresholds: Quality criteria (similarity, length, required terms)

Used By:
- Component tests: Validate quality for specific categories
- Regression tests: Monitor quality over time
- Property-based tests: Test invariants across all cases
- Manual validation: Compare LLM output to references
"""

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional


@dataclass
class GoldenTestCase:
    """
    Golden Test Case

    Structure of a single test case in the golden dataset.
    Each test case represents one customer support call with its
    expected summary and quality thresholds.
    """
    id: str
    category: str
    difficulty: str
    transcript: str
    golden_summary: str
    metadata: dict[str, Any]
    thresholds: dict[str, Any]

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> 'GoldenTestCase':
        """Create a GoldenTestCase from a dictionary."""
        return cls(
            id=data['id'],
            category=data['category'],
            difficulty=data['difficulty'],
            transcript=data['transcript'],
            golden_summary=data['golden_summary'],
            metadata=data['metadata'],
            thresholds=data['thresholds']
        )


@dataclass
class GoldenDatasetIndex:
    """
    Golden Dataset Index

    Structure of the index.json file that catalogs all test cases.
    Provides metadata and quick lookups without loading all files.
    """
    dataset_version: str
    last_updated: str
    total_cases: int
    categories: dict[str, int]
    difficulty_distribution: dict[str, int]
    test_cases: list[dict[str, str]]

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> 'GoldenDatasetIndex':
        """Create a GoldenDatasetIndex from a dictionary."""
        return cls(
            dataset_version=data['dataset_version'],
            last_updated=data['last_updated'],
            total_cases=data['total_cases'],
            categories=data['categories'],
            difficulty_distribution=data['difficulty_distribution'],
            test_cases=data['test_cases']
        )


class GoldenDatasetLoader:
    """
    Golden Dataset Loader

    Provides methods to load and filter test cases from the golden dataset.
    """

    def __init__(self, dataset_path: Optional[str] = None):
        """
        Creates a new GoldenDatasetLoader

        Automatically locates the golden-dataset directory relative to
        this source file location if no path is provided.

        Directory structure:
        - py-test/src/utils/golden_dataset.py (this file)
        - golden-dataset/ (target directory, 4 levels up)

        Args:
            dataset_path: Optional explicit path to golden-dataset directory.
                         If None, auto-detects relative to this file.
        """
        if dataset_path is None:
            # Navigate from py-test/src/utils to golden-dataset
            # Path: ./src/utils -> ./src -> ./py-test -> .. -> ../golden-dataset
            current_file = Path(__file__).resolve()
            self.dataset_path = current_file.parent.parent.parent.parent / 'golden-dataset'
        else:
            self.dataset_path = Path(dataset_path)

    def load_index(self) -> GoldenDatasetIndex:
        """
        Load Dataset Index

        Reads the index.json file containing metadata about all test cases.
        This provides a quick overview without loading individual files.

        Returns:
            Dataset index with metadata and file references

        Raises:
            FileNotFoundError: If index.json is not found
            json.JSONDecodeError: If index.json is invalid JSON

        Example:
            >>> loader = GoldenDatasetLoader()
            >>> index = loader.load_index()
            >>> print(f"Total cases: {index.total_cases}")
            >>> print(f"Categories: {index.categories}")
        """
        index_path = self.dataset_path / 'index.json'
        with open(index_path, encoding='utf-8') as f:
            data = json.load(f)
        return GoldenDatasetIndex.from_dict(data)

    def load_test_case(self, case_id: str) -> GoldenTestCase:
        """
        Load Single Test Case

        Loads a specific test case by its ID from the golden dataset.

        Workflow:
        1. Load index to find filename for this ID
        2. Read the test case file
        3. Parse and return the test case object

        Args:
            case_id: Test case ID (e.g., "call_001")

        Returns:
            Test case with transcript, golden summary, and thresholds

        Raises:
            ValueError: If test case ID is not found in index
            FileNotFoundError: If test case file is not found
            json.JSONDecodeError: If test case file is invalid JSON

        Example:
            >>> loader = GoldenDatasetLoader()
            >>> test_case = loader.load_test_case('call_001')
            >>> print(test_case.category)  # "password_reset"
            >>> print(test_case.golden_summary)  # "Customer was locked out..."
        """
        # Look up the test case in the index
        index = self.load_index()
        test_case_info = next(
            (tc for tc in index.test_cases if tc['id'] == case_id),
            None
        )

        if test_case_info is None:
            raise ValueError(f"Test case {case_id} not found in index")

        # Load and parse the test case file
        case_path = self.dataset_path / test_case_info['file']
        with open(case_path, encoding='utf-8') as f:
            data = json.load(f)
        return GoldenTestCase.from_dict(data)

    def load_all_test_cases(self) -> list[GoldenTestCase]:
        """
        Load All Test Cases

        Loads every test case in the golden dataset.
        This is used for comprehensive regression testing and benchmarking.

        Note: For large datasets, this may be slow. Consider loading
        cases on-demand or filtering by category/difficulty.

        Returns:
            List of all test cases in the dataset

        Example:
            >>> loader = GoldenDatasetLoader()
            >>> all_cases = loader.load_all_test_cases()
            >>> print(f"Loaded {len(all_cases)} test cases")
            >>> for tc in all_cases:
            ...     print(f"{tc.id}: {tc.category}")
        """
        index = self.load_index()
        return [self.load_test_case(tc['id']) for tc in index.test_cases]

    def load_by_category(self, category: str) -> list[GoldenTestCase]:
        """
        Load Test Cases by Category

        Loads all test cases for a specific category (e.g., "password_reset").
        Useful for category-specific quality validation.

        Categories in the dataset:
        - password_reset: Account access issues
        - billing_inquiry: Payment and charges
        - product_issue: Defective or broken products
        - account_update: Profile/settings changes
        - general_inquiry: Information requests

        Args:
            category: Category to filter by

        Returns:
            List of test cases in that category

        Example:
            >>> loader = GoldenDatasetLoader()
            >>> password_cases = loader.load_by_category('password_reset')
            >>> print(f"{len(password_cases)} password reset test cases")
        """
        index = self.load_index()
        return [
            self.load_test_case(tc['id'])
            for tc in index.test_cases
            if tc['category'] == category
        ]

    def load_by_difficulty(self, difficulty: str) -> list[GoldenTestCase]:
        """
        Load Test Cases by Difficulty

        Loads all test cases for a specific difficulty level.
        Useful for testing LLM performance on edge cases.

        Difficulty Levels:
        - easy: Straightforward, single-issue calls
        - medium: Multiple issues or clarifications needed
        - hard: Complex scenarios, multiple resolutions, edge cases

        Args:
            difficulty: Difficulty level to filter by

        Returns:
            List of test cases at that difficulty

        Example:
            >>> loader = GoldenDatasetLoader()
            >>> hard_cases = loader.load_by_difficulty('hard')
            >>> print(f"{len(hard_cases)} hard test cases")
        """
        index = self.load_index()
        return [
            self.load_test_case(tc['id'])
            for tc in index.test_cases
            if tc['difficulty'] == difficulty
        ]
