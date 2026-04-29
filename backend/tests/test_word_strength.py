import unittest

from app.api.routers.lists import calculate_strength
from app.models.vocab_word import VocabularyWord


class WordStrengthTests(unittest.TestCase):
    def test_new_word_is_weak(self):
        self.assertEqual(calculate_strength(0, 0), "weak")

    def test_low_accuracy_stays_weak(self):
        self.assertEqual(calculate_strength(5, 2), "weak")

    def test_medium_accuracy_becomes_okay_after_three_attempts(self):
        self.assertEqual(calculate_strength(3, 2), "okay")

    def test_high_accuracy_becomes_strong_after_five_attempts(self):
        self.assertEqual(calculate_strength(5, 5), "strong")

    def test_accuracy_is_zero_without_attempts(self):
        word = VocabularyWord(practice_attempts=0, correct_attempts=0)

        self.assertEqual(word.accuracy, 0.0)

    def test_accuracy_is_correct_attempts_over_total_attempts(self):
        word = VocabularyWord(practice_attempts=4, correct_attempts=3)

        self.assertEqual(word.accuracy, 0.75)


if __name__ == "__main__":
    unittest.main()
