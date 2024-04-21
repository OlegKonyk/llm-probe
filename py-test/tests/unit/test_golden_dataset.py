"""
Unit Tests for Golden Dataset Loader

Tests the GoldenDatasetLoader class for loading and managing test cases.
"""

import json
import shutil
import tempfile
from pathlib import Path

import pytest

from src.utils.golden_dataset import GoldenDatasetIndex, GoldenDatasetLoader, GoldenTestCase


@pytest.fixture
def temp_dataset_dir():
    """Create a temporary dataset directory with sample data"""
    temp_dir = tempfile.mkdtemp()
    dataset_path = Path(temp_dir) / 'golden-dataset'
    dataset_path.mkdir()

    # Create index.json
    index_data = {
        "dataset_version": "1.0.0",
        "last_updated": "2024-04-21",
        "total_cases": 3,
        "categories": {
            "password_reset": 2,
            "billing_inquiry": 1
        },
        "difficulty_distribution": {
            "easy": 2,
            "medium": 1
        },
        "test_cases": [
            {
                "id": "call_001",
                "category": "password_reset",
                "difficulty": "easy",
                "file": "sample-001.json"
            },
            {
                "id": "call_002",
                "category": "password_reset",
                "difficulty": "medium",
                "file": "sample-002.json"
            },
            {
                "id": "call_003",
                "category": "billing_inquiry",
                "difficulty": "easy",
                "file": "sample-003.json"
            }
        ]
    }

    with open(dataset_path / 'index.json', 'w') as f:
        json.dump(index_data, f)

    # Create sample test case files
    test_cases = [
        {
            "id": "call_001",
            "category": "password_reset",
            "difficulty": "easy",
            "transcript": "Customer called about password reset.",
            "golden_summary": "Customer reset password successfully",
            "metadata": {"sentiment": "neutral", "resolution": "resolved"},
            "thresholds": {
                "min_semantic_similarity": 0.80,
                "min_length_words": 5,
                "max_length_words": 15,
                "required_terms": ["password", "reset"]
            }
        },
        {
            "id": "call_002",
            "category": "password_reset",
            "difficulty": "medium",
            "transcript": "Customer had trouble resetting password after multiple attempts.",
            "golden_summary": "Customer successfully reset password after troubleshooting",
            "metadata": {"sentiment": "frustrated", "resolution": "resolved"},
            "thresholds": {
                "min_semantic_similarity": 0.75,
                "min_length_words": 5,
                "max_length_words": 20,
                "required_terms": ["password", "reset", "troubleshooting"]
            }
        },
        {
            "id": "call_003",
            "category": "billing_inquiry",
            "difficulty": "easy",
            "transcript": "Customer asked about recent charge on account.",
            "golden_summary": "Customer inquired about billing charge",
            "metadata": {"sentiment": "curious", "resolution": "explained"},
            "thresholds": {
                "min_semantic_similarity": 0.80,
                "min_length_words": 4,
                "max_length_words": 10,
                "required_terms": ["billing", "charge"]
            }
        }
    ]

    for i, test_case in enumerate(test_cases, 1):
        with open(dataset_path / f'sample-{i:03d}.json', 'w') as f:
            json.dump(test_case, f)

    yield dataset_path

    # Cleanup
    shutil.rmtree(temp_dir)


class TestGoldenTestCase:
    """Tests for GoldenTestCase dataclass"""

    def test_from_dict(self):
        """Test creating GoldenTestCase from dictionary"""
        data = {
            "id": "test_001",
            "category": "password_reset",
            "difficulty": "easy",
            "transcript": "Test transcript",
            "golden_summary": "Test summary",
            "metadata": {"sentiment": "neutral"},
            "thresholds": {"min_semantic_similarity": 0.80}
        }

        test_case = GoldenTestCase.from_dict(data)

        assert test_case.id == "test_001"
        assert test_case.category == "password_reset"
        assert test_case.difficulty == "easy"
        assert test_case.transcript == "Test transcript"
        assert test_case.golden_summary == "Test summary"
        assert test_case.metadata["sentiment"] == "neutral"
        assert test_case.thresholds["min_semantic_similarity"] == 0.80


class TestGoldenDatasetIndex:
    """Tests for GoldenDatasetIndex dataclass"""

    def test_from_dict(self):
        """Test creating GoldenDatasetIndex from dictionary"""
        data = {
            "dataset_version": "1.0.0",
            "last_updated": "2024-04-21",
            "total_cases": 2,
            "categories": {"password_reset": 1, "billing": 1},
            "difficulty_distribution": {"easy": 2},
            "test_cases": [
                {
                    "id": "call_001",
                    "category": "password_reset",
                    "difficulty": "easy",
                    "file": "sample-001.json"
                }
            ]
        }

        index = GoldenDatasetIndex.from_dict(data)

        assert index.dataset_version == "1.0.0"
        assert index.total_cases == 2
        assert index.categories["password_reset"] == 1
        assert len(index.test_cases) == 1


class TestGoldenDatasetLoader:
    """Tests for GoldenDatasetLoader class"""

    def test_init_with_explicit_path(self, temp_dataset_dir):
        """Test initialization with explicit dataset path"""
        loader = GoldenDatasetLoader(dataset_path=str(temp_dataset_dir))
        assert loader.dataset_path == temp_dataset_dir

    def test_init_with_default_path(self):
        """Test initialization with default path resolution"""
        loader = GoldenDatasetLoader()
        # Should resolve to a path that exists relative to the source file
        assert loader.dataset_path is not None
        assert isinstance(loader.dataset_path, Path)

    def test_load_index(self, temp_dataset_dir):
        """Test loading dataset index"""
        loader = GoldenDatasetLoader(dataset_path=str(temp_dataset_dir))
        index = loader.load_index()

        assert index.dataset_version == "1.0.0"
        assert index.total_cases == 3
        assert index.categories["password_reset"] == 2
        assert index.categories["billing_inquiry"] == 1
        assert index.difficulty_distribution["easy"] == 2
        assert index.difficulty_distribution["medium"] == 1
        assert len(index.test_cases) == 3

    def test_load_index_missing_file(self):
        """Test loading index when file doesn't exist"""
        temp_dir = tempfile.mkdtemp()
        loader = GoldenDatasetLoader(dataset_path=temp_dir)

        with pytest.raises(FileNotFoundError):
            loader.load_index()

        shutil.rmtree(temp_dir)

    def test_load_test_case(self, temp_dataset_dir):
        """Test loading a single test case"""
        loader = GoldenDatasetLoader(dataset_path=str(temp_dataset_dir))
        test_case = loader.load_test_case('call_001')

        assert test_case.id == 'call_001'
        assert test_case.category == 'password_reset'
        assert test_case.difficulty == 'easy'
        assert 'password reset' in test_case.transcript.lower()
        assert 'password' in test_case.golden_summary.lower()
        assert test_case.thresholds['min_semantic_similarity'] == 0.80

    def test_load_test_case_not_found(self, temp_dataset_dir):
        """Test loading a non-existent test case"""
        loader = GoldenDatasetLoader(dataset_path=str(temp_dataset_dir))

        with pytest.raises(ValueError, match="not found in index"):
            loader.load_test_case('call_999')

    def test_load_all_test_cases(self, temp_dataset_dir):
        """Test loading all test cases"""
        loader = GoldenDatasetLoader(dataset_path=str(temp_dataset_dir))
        all_cases = loader.load_all_test_cases()

        assert len(all_cases) == 3
        assert all(isinstance(tc, GoldenTestCase) for tc in all_cases)

        # Verify we got all expected IDs
        ids = [tc.id for tc in all_cases]
        assert 'call_001' in ids
        assert 'call_002' in ids
        assert 'call_003' in ids

    def test_load_by_category(self, temp_dataset_dir):
        """Test loading test cases by category"""
        loader = GoldenDatasetLoader(dataset_path=str(temp_dataset_dir))

        # Load password reset cases
        password_cases = loader.load_by_category('password_reset')
        assert len(password_cases) == 2
        assert all(tc.category == 'password_reset' for tc in password_cases)

        # Load billing cases
        billing_cases = loader.load_by_category('billing_inquiry')
        assert len(billing_cases) == 1
        assert billing_cases[0].category == 'billing_inquiry'

    def test_load_by_category_empty(self, temp_dataset_dir):
        """Test loading test cases for non-existent category"""
        loader = GoldenDatasetLoader(dataset_path=str(temp_dataset_dir))
        cases = loader.load_by_category('nonexistent_category')

        assert len(cases) == 0

    def test_load_by_difficulty(self, temp_dataset_dir):
        """Test loading test cases by difficulty"""
        loader = GoldenDatasetLoader(dataset_path=str(temp_dataset_dir))

        # Load easy cases
        easy_cases = loader.load_by_difficulty('easy')
        assert len(easy_cases) == 2
        assert all(tc.difficulty == 'easy' for tc in easy_cases)

        # Load medium cases
        medium_cases = loader.load_by_difficulty('medium')
        assert len(medium_cases) == 1
        assert medium_cases[0].difficulty == 'medium'

    def test_load_by_difficulty_empty(self, temp_dataset_dir):
        """Test loading test cases for non-existent difficulty"""
        loader = GoldenDatasetLoader(dataset_path=str(temp_dataset_dir))
        cases = loader.load_by_difficulty('hard')

        assert len(cases) == 0

    def test_test_case_structure_integrity(self, temp_dataset_dir):
        """Test that loaded test cases have all required fields"""
        loader = GoldenDatasetLoader(dataset_path=str(temp_dataset_dir))
        test_case = loader.load_test_case('call_001')

        # Check all required fields exist
        assert hasattr(test_case, 'id')
        assert hasattr(test_case, 'category')
        assert hasattr(test_case, 'difficulty')
        assert hasattr(test_case, 'transcript')
        assert hasattr(test_case, 'golden_summary')
        assert hasattr(test_case, 'metadata')
        assert hasattr(test_case, 'thresholds')

        # Check threshold fields
        assert 'min_semantic_similarity' in test_case.thresholds
        assert 'min_length_words' in test_case.thresholds
        assert 'max_length_words' in test_case.thresholds
        assert 'required_terms' in test_case.thresholds

        # Check metadata fields
        assert 'sentiment' in test_case.metadata
        assert 'resolution' in test_case.metadata

    def test_filtering_combinations(self, temp_dataset_dir):
        """Test combining different filtering approaches"""
        loader = GoldenDatasetLoader(dataset_path=str(temp_dataset_dir))

        # Get all easy password reset cases
        all_cases = loader.load_all_test_cases()
        easy_password_cases = [
            tc for tc in all_cases
            if tc.category == 'password_reset' and tc.difficulty == 'easy'
        ]

        assert len(easy_password_cases) == 1
        assert easy_password_cases[0].id == 'call_001'
