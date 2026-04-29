import test from "node:test";
import assert from "node:assert/strict";

import {
  buildPracticeWordIds,
  buildQuizQuestions,
  formatElapsedTime,
  normalizeAnswer,
} from "./gameShared.js";

const words = [
  {
    id: "word-1",
    term: "hola",
    definition: "hello",
    language: "Spanish",
    deckName: "Basics",
  },
  {
    id: "word-2",
    term: "adios",
    definition: "goodbye",
    language: "Spanish",
    deckName: "Basics",
  },
  {
    id: "word-3",
    term: "gracias",
    definition: "thank you",
    language: "Spanish",
    deckName: "Basics",
  },
  {
    id: "word-4",
    term: "noche",
    definition: "night",
    language: "Spanish",
    deckName: "Basics",
  },
];

test("normalizeAnswer ignores extra spacing and capitalization", () => {
  assert.equal(normalizeAnswer("  HoLa  "), "hola");
});

test("formatElapsedTime returns minute and zero-padded seconds", () => {
  assert.equal(formatElapsedTime(0), "0:00");
  assert.equal(formatElapsedTime(65), "1:05");
});

test("buildPracticeWordIds removes duplicate word IDs", () => {
  assert.deepEqual(buildPracticeWordIds(["word-1", "word-1", "word-2"]), [
    "word-1",
    "word-2",
  ]);
});

test("buildQuizQuestions creates multiple-choice questions with the correct answer included", () => {
  const questions = buildQuizQuestions(words, 4, ["multiple-choice"]);

  assert.equal(questions.length, 4);
  for (const question of questions) {
    assert.equal(question.type, "multiple-choice");
    assert.equal(question.options.length, 4);
    assert.ok(question.options.includes(question.correctAnswer));
  }
});

test("buildQuizQuestions can create typed translation questions", () => {
  const questions = buildQuizQuestions(words, 2, ["translation"]);

  assert.equal(questions.length, 2);
  for (const question of questions) {
    assert.equal(question.type, "translation");
    assert.ok(question.prompt);
    assert.ok(question.correctAnswer);
  }
});

test("buildQuizQuestions can create true-false questions", () => {
  const questions = buildQuizQuestions(words, 2, ["true-false"]);

  assert.equal(questions.length, 2);
  for (const question of questions) {
    assert.equal(question.type, "true-false");
    assert.equal(typeof question.correctAnswer, "boolean");
    assert.ok(question.statementAnswer);
  }
});
