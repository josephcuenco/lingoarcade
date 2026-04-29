# LingoArcade Project Documentation v1

## 1. Project Summary

### Project name

LingoArcade

### One-sentence description

LingoArcade is a web app that helps users learn foreign language vocabulary by turning their word decks into interactive study games and tracking their progress over time.

### Problem it solves

Vocabulary learning can feel repetitive and difficult to sustain over time. LingoArcade is designed to make vocabulary practice more motivating by combining:

- user-owned vocabulary lists
- game-based study formats
- visible progress tracking
- adaptive practice over time

The long-term goal is to help learners feel more in control of their learning, stay motivated through clear goals, and see growth through measurable performance.

### Target users

- language learners
- students
- self-directed learners building personal vocabulary lists

### Why this project exists

LingoArcade is being built out of a genuine interest in language learning and a desire to create a tool that is both useful to learners and strong as a technically impressive software project.

## 2. Product Vision

LingoArcade starts as a vocabulary game platform, but the larger vision is for it to become an adaptive AI-powered language learning system.

Instead of only letting a user add words and manually choose study activities, the platform should eventually help manage the full learning cycle:

- decide what the user should study
- decide how they should study it
- generate game content dynamically
- measure performance
- adjust future study sessions based on results

This moves the project from a simple study app to a more intelligent learning platform.

## 3. Core Product Goals

- Let users store and organize vocabulary by language and deck
- Let users study vocabulary through multiple game and quiz formats
- Track learning performance over time
- Surface progress in a motivating and readable way
- Eventually use AI to personalize study sessions and content generation

## 4. Current Product Direction

The current app foundation includes:

- authentication
- language-based deck organization
- word and definition management
- a dark, colorful frontend theme
- a fixed sidebar app layout
- a game hub with playable study games
- deployed friend-testing infrastructure

This means the project has moved beyond scaffolding and is now in an MVP / friend-testing phase.

## 5. MVP Definition

The MVP should answer one main question:

Can a user sign up, add vocabulary, practice it through game-like study flows, and see progress?

### MVP feature set

#### Authentication and user accounts

- user registration and login
- protected routes
- user-specific vocabulary data

#### Vocabulary management

- create languages
- create decks within a language
- add, edit, and delete words
- store translations or definitions

#### Study and game flow

- user chooses a deck or set of decks to practice
- system serves study content in game or quiz formats
- available formats include quiz, card matching, BingoBlitz, word search, crossword, and word builder

#### Session tracking

- store words practiced
- store quiz correct versus incorrect answers
- track word-level accuracy and strength
- update last-practiced timestamps from quizzes and games
- track game time, flips, misses, and bonus challenge results in the frontend game flow

#### Dashboard and progress

- total words studied
- study accuracy
- recent sessions
- streaks or other basic learning metrics as future work

#### Basic deployment

- deployed frontend
- deployed backend
- cloud-hosted database

## 6. Implemented MVP Game Modes

The current app includes several playable practice formats connected to user vocabulary data.

### Quiz

- multiple-choice questions
- typed translation questions
- true/false questions
- configurable language, decks, strengths, question count, and question formats
- updates word accuracy and strength

### Card Matching

- matching pairs of vocabulary terms and translations
- small, medium, and large board sizes
- flip count, timer, replay, and bonus challenges

### BingoBlitz

- memorization phase followed by timed prompts
- configurable game size, speed, decks, strengths, and translation direction
- missed words repeat until completed

### Word Search

- translations hidden in a letter grid
- word list shows prompts to find
- supports translation direction and bonus time challenges

### Crossword

- generated crossword board from vocabulary words
- numbered clue sections for across and down entries
- check-puzzle flow, locked correct letters, and a bonus challenge

### Word Builder

- prompts users to assemble the correct translation from scattered letters
- optional distraction letters
- timer-based rounds and replay flow

## 7. Long-Term Differentiator: AI Learning Coach

The major long-term upgrade for LingoArcade is an agentic AI learning coach.

### Vision

Instead of:

User inputs words -> user picks a game -> user studies manually

The system should evolve toward:

User inputs words -> AI plans study session -> AI generates or selects activity -> AI analyzes results -> AI adapts future study

### Future AI responsibilities

#### 1. Plan study sessions

The AI should eventually decide:

- which words should be reviewed
- which words are new
- which game mode should be used
- how difficult a session should be

These decisions should be informed by:

- past performance
- response accuracy
- retention patterns
- user goals

#### 2. Generate learning content

The AI should eventually help generate:

- quiz questions
- multiple-choice distractors
- contextual sentences
- hints
- game prompts

#### 3. Analyze performance

After each session, the AI should be able to analyze:

- accuracy
- mistakes
- response speed
- streaks
- repeated trouble words

#### 4. Adapt future learning

Using those results, the system should eventually:

- resurface difficult words
- lower or raise difficulty
- recommend next study sessions
- generate periodic progress summaries

## 8. High-Level Architecture

LingoArcade is expected to grow into a service-oriented, event-driven system.

### Core components

#### Frontend

- React
- user interface for auth, vocabulary, games, and dashboard

#### Backend API

- FastAPI
- authentication
- vocabulary CRUD
- study session creation and submission
- dashboard data

#### Database

- PostgreSQL
- stores users, languages, decks, words, sessions, and performance data

#### Async worker layer

- Celery workers
- Redis as broker for background jobs

#### AI integration

- paused for now while the AI product direction is evaluated
- potential future use for content generation and adaptive learning features

#### Infrastructure

- Netlify frontend deployment
- Render backend deployment
- Render PostgreSQL database
- AWS-oriented deployment path for future production use

## 9. Event-Driven Architecture Direction

One of the strongest long-term technical themes for the project is async, event-driven processing.

### Example flow

When a user finishes a game:

1. frontend submits results to API
2. API stores immediate session results
3. API sends background job to queue
4. worker processes learning updates
5. analytics, difficulty scores, or future study recommendations are updated asynchronously

### Good async job candidates

- process session results
- update word difficulty
- generate future game content
- create weekly progress reports
- compute learning summaries

This is a strong fit for cloud-oriented architecture and a good long-term differentiator for the project.

## 10. AWS / Cloud Direction

LingoArcade does not need full cloud complexity immediately, but the project is intentionally aligned with a cloud-native growth path.

### Likely cloud services later

- EC2 for backend or worker hosting
- RDS for PostgreSQL
- S3 for generated assets, reports, or exports
- SQS or Redis-backed queues for background jobs
- CloudWatch or equivalent for logs and monitoring

## 11. Data and Analytics Opportunities

The app can generate valuable learning data over time, including:

- words added
- words studied
- session scores
- time spent studying
- accuracy trends
- difficult words
- retention patterns

This opens up future features such as:

- progress dashboards
- retention insights
- AI-generated progress summaries
- study recommendations

## 12. Proposed System Entities

At a high level, the project should continue to center around these core entities:

- User
- Language
- Deck
- Word
- Study Session
- Study Result
- Word Performance

## 13. Development Phases

### Phase 1: Foundation

- auth
- basic backend
- deck and word management
- protected app flow

### Phase 2: Playable study experience

- quiz/study session flow
- result tracking
- first real game mode
- game page connected to actual deck data

### Phase 3: Progress and adaptation

- session analytics
- dashboard improvements
- spaced repetition or difficulty logic
- smarter practice recommendations

### Phase 4: AI learning system

- AI-generated content
- adaptive session planning
- AI learning coach interactions
- weekly reports and recommendations

## 14. Immediate Next Priorities

Based on the current state of the project, the best near-term priorities are:

1. Build out the Stats page with real progress data
2. Add study session history and trend summaries
3. Improve mobile layout polish
4. Refine crossword generation quality
5. Decide whether AI-generated content belongs in the MVP or a later phase

## 15. Current MVP Status

The MVP now supports the core loop:

- register or log in
- create a language
- create decks and vocabulary words
- practice through quiz or game formats
- update last-practiced activity
- update word strength through quiz results
- deploy the app for external testers

## 16. Documentation Intent

This document is the first structured version of the LingoArcade project documentation. It should evolve over time into a more complete product and technical reference, including:

- product overview
- feature roadmap
- architecture decisions
- API documentation
- database model notes
- game design notes
- AI system design
- deployment guidance

## 17. Working Version Notes

This is a living document, not a final spec. It is intended to:

- keep product direction clear
- help guide implementation decisions
- capture the architecture story behind the app
- serve as a base for future project documentation and portfolio presentation
