from fastapi import FastAPI

from app.api.routers import auth, lists
from app.core.config import settings

app = FastAPI(title=settings.app_name)

app.include_router(auth.router)
app.include_router(lists.router)



@app.get("/health")
def health_check():
    return {"status": "ok"}