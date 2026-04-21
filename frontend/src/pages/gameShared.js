export const textMuted = "#bfc7e6";
export const textSoft = "#cfd6ef";
export const textStrong = "#f7f8ff";
export const panelBackground =
  "linear-gradient(180deg, rgba(17, 21, 36, 0.92), rgba(12, 15, 28, 0.92))";
export const panelBorder = "1px solid rgba(130, 151, 255, 0.18)";
export const panelShadow =
  "0 24px 70px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.04)";

export const primaryButtonStyle = {
  border: "none",
  borderRadius: "999px",
  padding: "12px 18px",
  background: "linear-gradient(135deg, #48b7ff 0%, #935dff 48%, #ff4d9d 100%)",
  color: "#f8f5ef",
  cursor: "pointer",
  boxShadow: "0 18px 35px rgba(112, 85, 255, 0.3)",
};

export const secondaryButtonStyle = {
  border: "1px solid rgba(130, 151, 255, 0.18)",
  borderRadius: "999px",
  padding: "12px 18px",
  background: "rgba(255,255,255,0.06)",
  color: textStrong,
  cursor: "pointer",
  boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.03)",
};

export const gameOptions = [
  {
    name: "Quiz",
    accent: "#76f7d5",
    description: "Quick recall rounds with prompts and answers pulled from your decks.",
    status: "available",
    path: "/games/quiz",
    buttonLabel: "Play quiz",
  },
  {
    name: "Card Matching",
    accent: "#ff79c6",
    description: "Flip cards, find each word and translation pair, and race your best time.",
    status: "available",
    path: "/games/card-matching",
    buttonLabel: "Play matching",
  },
  {
    name: "Word Search",
    accent: "#48b7ff",
    description: "Find hidden vocabulary terms in a puzzle grid built from your study words.",
    status: "coming-soon",
  },
  {
    name: "Bingo",
    accent: "#ffb86c",
    description: "Race the timer as prompts appear and you find each translation on the board.",
    status: "available",
    path: "/games/bingo",
    buttonLabel: "Play bingo",
  },
  {
    name: "Crossword",
    accent: "#b388ff",
    description: "Solve clue-based grids using the words and translations from your decks.",
    status: "coming-soon",
  },
  {
    name: "Word Builder",
    accent: "#76f7d5",
    description: "Assemble words from fragments and practice spelling and recognition.",
    status: "coming-soon",
  },
];

export const strengthOptions = [
  { value: "weak", label: "Weak words" },
  { value: "okay", label: "Okay words" },
  { value: "strong", label: "Strong words" },
];

export const questionTypeOptions = [
  { value: "multiple-choice", label: "Multiple choice" },
  { value: "translation", label: "Translation" },
  { value: "true-false", label: "True / False" },
  // AI fill-in-the-blank is paused while we think through the OpenAI direction.
  // { value: "fill-blank", label: "Fill in the blank" },
];

export const chooseDeckErrorMessage = "Choose at least one deck for the quiz.";

export const strengthStyles = {
  weak: {
    label: "Weak",
    color: "#ffb5d5",
    border: "1px solid rgba(255, 92, 156, 0.28)",
    background: "rgba(255, 77, 157, 0.14)",
  },
  okay: {
    label: "Okay",
    color: "#ffe3a3",
    border: "1px solid rgba(255, 197, 74, 0.26)",
    background: "rgba(255, 197, 74, 0.12)",
  },
  strong: {
    label: "Strong",
    color: "#8ff8de",
    border: "1px solid rgba(118, 247, 213, 0.3)",
    background: "rgba(118, 247, 213, 0.12)",
  },
};

export function formatLastPlayed(lastPracticedAt) {
  if (!lastPracticedAt) {
    return "Not played yet";
  }

  const practicedDate = new Date(lastPracticedAt);
  const currentDate = new Date();
  practicedDate.setHours(0, 0, 0, 0);
  currentDate.setHours(0, 0, 0, 0);

  const dayDifference = Math.round(
    (currentDate.getTime() - practicedDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (dayDifference <= 0) {
    return "Played today";
  }

  if (dayDifference === 1) {
    return "Played yesterday";
  }

  return `Played ${dayDifference} days ago`;
}

export function shuffle(items) {
  const nextItems = [...items];

  for (let index = nextItems.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [nextItems[index], nextItems[randomIndex]] = [
      nextItems[randomIndex],
      nextItems[index],
    ];
  }

  return nextItems;
}

export function normalizeAnswer(value) {
  return value.trim().toLowerCase();
}

export function formatElapsedTime(totalSeconds) {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

// AI fill-in-the-blank is paused while we think through the OpenAI direction.
// function buildFillInBlankSentence(definition) {
//   const cleanedDefinition = definition.trim().replace(/[.!?]+$/g, "");
//   const normalizedDefinition = cleanedDefinition.toLowerCase();
//
//   const specialCases = [
//     {
//       matches: ["hello", "hi"],
//       sentence: "When I greet someone warmly, I say ____.",
//     },
//     {
//       matches: ["goodbye", "bye", "see you later"],
//       sentence: "When I leave at the end of a conversation, I say ____.",
//     },
//     {
//       matches: ["thank you", "thanks"],
//       sentence: "After someone helps me, I say ____.",
//     },
//     {
//       matches: ["please"],
//       sentence: "When I ask politely for something, I say ____.",
//     },
//     {
//       matches: ["sorry"],
//       sentence: "If I make a mistake and want to apologize, I say ____.",
//     },
//     {
//       matches: ["yes"],
//       sentence: "When I agree with someone, I say ____.",
//     },
//     {
//       matches: ["no"],
//       sentence: "When I disagree or refuse something, I say ____.",
//     },
//     {
//       matches: ["good morning"],
//       sentence: "At the start of the day, I greet someone by saying ____.",
//     },
//     {
//       matches: ["good night"],
//       sentence: "Before going to sleep, I say ____.",
//     },
//     {
//       matches: ["nice to meet you"],
//       sentence: "When I meet someone for the first time, I say ____.",
//     },
//   ];
//
//   const matchingTemplate = specialCases.find(({ matches }) =>
//     matches.includes(normalizedDefinition),
//   );
//
//   if (matchingTemplate) {
//     return matchingTemplate.sentence;
//   }
//
//   return `Choose the word or phrase that best completes this idea: "I want to say ${cleanedDefinition}, so I would use ____."`;
// }

export function buildQuizQuestions(words, limit, selectedQuestionTypes) {
  const eligibleWords = words.filter((word) => word.definition);
  const shuffledWords = shuffle(eligibleWords).slice(0, limit);
  const questionTypes =
    selectedQuestionTypes.length > 0 ? selectedQuestionTypes : ["multiple-choice"];
  const questionTypeSequence = shuffle(
    Array.from({ length: shuffledWords.length }, (_, index) =>
      questionTypes[index % questionTypes.length],
    ),
  );

  return shuffledWords
    .map((word, index) => {
      const questionType = questionTypeSequence[index];
      const askForDefinition = Math.random() >= 0.5;
      const prompt = askForDefinition ? word.term : word.definition;
      const correctAnswer = askForDefinition ? word.definition : word.term;
      const promptLanguage = askForDefinition ? word.language : "English";
      const answerLanguage = askForDefinition ? "English" : word.language;

      if (questionType === "translation") {
        return {
          id: word.id,
          type: "translation",
          prompt,
          correctAnswer,
          promptLanguage,
          answerLanguage,
          deckName: word.deckName,
          language: word.language,
        };
      }

      if (questionType === "true-false") {
        const alternateAnswers = eligibleWords
          .filter((candidate) => candidate.id !== word.id)
          .map((candidate) => (askForDefinition ? candidate.definition : candidate.term))
          .filter((value, optionIndex, values) => values.indexOf(value) === optionIndex);
        const useTrueStatement = alternateAnswers.length === 0 || Math.random() >= 0.5;
        const statementAnswer = useTrueStatement
          ? correctAnswer
          : shuffle(alternateAnswers)[0];

        return {
          id: word.id,
          type: "true-false",
          prompt,
          correctAnswer: useTrueStatement,
          promptLanguage,
          answerLanguage,
          statementAnswer,
          deckName: word.deckName,
          language: word.language,
        };
      }

      // AI fill-in-the-blank is paused while we think through the OpenAI direction.
      // if (questionType === "fill-blank") {
      //   const distractors = shuffle(
      //     eligibleWords
      //       .filter((candidate) => candidate.id !== word.id)
      //       .map((candidate) => candidate.term),
      //   )
      //     .filter((term, optionIndex, terms) => terms.indexOf(term) === optionIndex)
      //     .slice(0, 3);
      //
      //   const options = shuffle([word.term, ...distractors]).slice(0, 4);
      //
      //   return {
      //     id: word.id,
      //     type: "fill-blank",
      //     prompt: word.fill_blank_sentence || buildFillInBlankSentence(word.definition),
      //     correctAnswer: word.term,
      //     promptLanguage: "English context",
      //     answerLanguage: word.language,
      //     options,
      //     deckName: word.deckName,
      //     language: word.language,
      //   };
      // }

      const distractors = shuffle(
        eligibleWords
          .filter((candidate) => candidate.id !== word.id)
          .map((candidate) => (askForDefinition ? candidate.definition : candidate.term)),
      )
        .filter((definition, optionIndex, definitions) =>
          definitions.indexOf(definition) === optionIndex,
        )
        .slice(0, 3);

      const options = shuffle([correctAnswer, ...distractors]).slice(0, 4);

      return {
        id: word.id,
        type: "multiple-choice",
        prompt,
        correctAnswer,
        promptLanguage,
        answerLanguage,
        options,
        deckName: word.deckName,
        language: word.language,
      };
    })
    .filter((question) => {
      if (question.type === "translation" || question.type === "true-false") {
        return true;
      }

      return question.options.length === 4;
    });
}
