# LingoArcade Deployment

This setup gets LingoArcade online so friends can create accounts and test the app.

## Current Deployment

- Frontend static site: Netlify
- Backend API: Render Web Service
- Database: Render PostgreSQL

## Backend On Render

1. Push the latest code to GitHub.
2. Create a PostgreSQL database.
3. Create a Web Service from this repo.
4. Use `backend` as the root directory.
5. Add the backend environment variables below.
6. After deployment, open `/health` on the API URL and confirm it returns `{"status":"ok"}`.

Use these backend settings:

```text
Root directory: backend
Build command: pip install -r requirements.txt
Start command: alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT
Health check path: /health
```

Render free web services do not include Pre-Deploy Commands, so migrations are run at startup with `alembic upgrade head && ...`.

Backend environment variables:

```text
DATABASE_URL=your-render-postgres-internal-url
SECRET_KEY=your-long-random-secret
DEBUG=false
CORS_ORIGINS=https://your-netlify-site.netlify.app
```

## Frontend

Set this environment variable in your frontend host:

```text
VITE_API_BASE_URL=https://your-lingoarcade-api.onrender.com
```

Use these build settings:

```text
Base directory: frontend
Build command: npm run build
Publish directory: dist
```

## After Both Are Live

1. Copy the frontend URL.
2. Add it to the backend `CORS_ORIGINS` environment variable in Render.
3. Redeploy the backend.
4. Test register, login, creating a language, creating a deck, and playing a quiz.

## Notes

- Do not commit real `.env` files.
- `SECRET_KEY` must stay private.
- Use the Render Postgres Internal Database URL for the deployed backend.
- Run `alembic upgrade head` locally after pulling migrations.
- The Render backend may sleep on the free tier, so the first request after inactivity can be slow.
