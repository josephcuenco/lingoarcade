# LingoArcade

Inspired by the flaschard app Anki and a passion for langugage learning, LingoArcade is a full-stack language-learning web app that lets users build vocabulary decks, practice through quizzes and specialized word games, and track word-level progress over time.

The project is designed as both a useful study tool and a portfolio-ready demonstration of full-stack product development: authenticated users, persistent data, game logic, progress tracking, cloud deployment, and a polished interactive frontend.

## Highlights

- User authentication with protected app routes
- Language-based vocabulary organization
- Deck and word CRUD with edit/delete confirmation flows
- Word strength tracking: weak, okay, and strong
- Quiz mode with multiple choice, typed translation, and true/false questions
- Specialized game modes: Card Matching, BingoBlitz, Word Search, Crossword, and Word Builder
- Timed gameplay, bonus challenges, replay flows, and game-specific setup screens
- Deployed frontend, backend API, and PostgreSQL database for live friend testing

## Tech Stack

### Frontend

- React (Javascript)
- React Router
- Vite
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

![LingoArcade Build page](images/LA%20-%20buildpage.png)


### Quiz

Users build custom quizzes by selecting a language, decks, word strengths, question count, and question formats. Quiz results update word accuracy and strength.

![LingoArcade Quiz Builder](images/LA%20-%20quiz%20builder.png)

![LingoArcade Quiz in progress](images/LA%20-%20quiz%20in%20progress.png)


### Play

The game hub offers multiple practice formats:

![LingoArcade Game Hub](images/LA%20-%20gamehub.png)

- Card Matching: match words with translations while tracking flips and time.
- BingoBlitz: memorize a board, respond to timed prompts, and clear all words.
- Word Search: find hidden translations in a letter grid.
- Crossword: fill a generated crossword from vocabulary clues.
- Word Builder: assemble translations from scattered letters before time runs out.

![LingoArcade BingoBlitz](images/LA%20-%20bingo.png)
_BingoBlitz_

### Stats

A placeholder stats page is included as the next product area for future learning analytics and progress dashboards.


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
