# LingoArcade Deployment

This setup gets LingoArcade online so friends can create accounts and test the app.

## Recommended First Deployment

- Backend API and Postgres database: Render
- Frontend static site: Render Static Site, Netlify, or Vercel

## Backend On Render

1. Push the latest code to GitHub.
2. In Render, create a new Blueprint from this repo.
3. Render will read `render.yaml` and create `lingoarcade-api` plus `lingoarcade-db`.
4. When prompted for `CORS_ORIGINS`, use your deployed frontend URL.
5. After deployment, open `/health` on the API URL and confirm it returns `{"status":"ok"}`.

## Frontend

Set this environment variable in your frontend host:

```text
VITE_API_BASE_URL=https://your-lingoarcade-api.onrender.com
```

Use these build settings:

```text
Build command: npm run build
Publish directory: frontend/dist
```

If the host asks for a root/base directory, use:

```text
frontend
```

## After Both Are Live

1. Copy the frontend URL.
2. Add it to the backend `CORS_ORIGINS` environment variable in Render.
3. Redeploy the backend.
4. Test register, login, creating a language, creating a deck, and playing a quiz.

## Notes

- Do not commit real `.env` files.
- `SECRET_KEY` must stay private.
- Run `alembic upgrade head` locally after pulling migrations. Render runs it automatically before deploy.
