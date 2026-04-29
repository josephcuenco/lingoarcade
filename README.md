# LingoArcade

LingoArcade is a full-stack language-learning web app that lets users build vocabulary decks, practice through quizzes and games, and track word-level progress over time.

The project is designed as both a useful study tool and a portfolio-ready demonstration of full-stack product development: authenticated users, persistent data, game logic, progress tracking, cloud deployment, and a polished interactive frontend.

## Highlights

- User authentication with protected app routes
- Language-based vocabulary organization
- Deck and word CRUD with edit/delete confirmation flows
- Word strength tracking: weak, okay, and strong
- Quiz mode with multiple choice, typed translation, and true/false questions
- Game modes: Card Matching, BingoBlitz, Word Search, Crossword, and Word Builder
- Timed gameplay, bonus challenges, replay flows, and game-specific setup screens
- Last-practiced tracking across quizzes and games
- Responsive dark neon UI with a fixed sidebar navigation layout
- Deployed frontend, backend API, and PostgreSQL database for live friend testing

## Screenshots

### Build Page

Users manage languages, decks, vocabulary words, word counts, strength groups, and recent practice activity from the Build page.

![LingoArcade Build page](images/LA%20-%20buildpage.png)

### Game Hub

The Play section gives users a visual menu of available vocabulary practice games.

![LingoArcade Game Hub](images/LA%20-%20gamehub.png)

### Quiz Builder

Users can customize quiz sessions by language, deck, word strength, question count, and question format.

![LingoArcade Quiz Builder](images/LA%20-%20quiz%20builder.png)

### Quiz In Progress

Quiz sessions show one question at a time, track progress, and update word performance after completion.

![LingoArcade Quiz in progress](images/LA%20-%20quiz%20in%20progress.png)

### BingoBlitz

BingoBlitz turns vocabulary review into a timed board game with memorization, prompts, misses, and completion tracking.

![LingoArcade BingoBlitz](images/LA%20-%20bingo.png)

## Tech Stack

### Frontend

- React
- Vite
- React Router
- CSS modules/global CSS styling
- Netlify deployment

### Backend

- FastAPI
- SQLAlchemy
- Alembic migrations
- PostgreSQL
- JWT-based authentication
- Render deployment

## App Sections

### Build

Users create languages, add vocabulary decks, and manage words/translations. Deck cards show word counts, strength groups, and last-practiced timing.

### Quiz

Users build custom quizzes by selecting a language, decks, word strengths, question count, and question formats. Quiz results update word accuracy and strength.

### Play

The game hub offers multiple practice formats:

- Card Matching: match words with translations while tracking flips and time.
- BingoBlitz: memorize a board, respond to timed prompts, and clear all words.
- Word Search: find hidden translations in a letter grid.
- Crossword: fill a generated crossword from vocabulary clues.
- Word Builder: assemble translations from scattered letters before time runs out.

### Stats

A placeholder stats page is included as the next product area for future learning analytics and progress dashboards.

## Word Strength System

Each vocabulary word stores:

- total quiz attempts
- correct quiz attempts
- calculated accuracy
- strength category
- last practiced timestamp

Only quiz answers affect accuracy and strength. Practice games update `last_practiced_at` so users can see recent activity without games changing retention scores.

Current strength categories:

- Weak: new words or low accuracy
- Okay: medium accuracy
- Strong: high accuracy

## Local Development

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

Run backend unit tests:

```powershell
cd backend
.\.venv\Scripts\python -m unittest discover -s tests
```

Create a backend `.env` file locally:

```text
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/lingoarcade
SECRET_KEY=your-local-secret
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

Run frontend unit tests:

```powershell
cd frontend
npm test
```

Create a frontend `.env` file locally:

```text
VITE_API_BASE_URL=http://127.0.0.1:8000
```

## Deployment

The current deployment path uses:

- Netlify for the frontend
- Render for the FastAPI backend
- Render PostgreSQL for the database

See [docs/deployment.md](docs/deployment.md) for setup notes and environment variables.

## Project Status

LingoArcade is currently in an MVP / friend-testing stage. Core account, deck, quiz, game, and persistence flows are working. The next major feature area is a more complete Stats page with long-term learning analytics.

## Future Improvements

- Stats dashboard with trends and study history
- More advanced spaced repetition logic
- Better crossword generation quality
- More accessibility and mobile polish
- Optional AI-assisted content generation after product direction is finalized
- Background jobs for analytics and scheduled learning summaries
