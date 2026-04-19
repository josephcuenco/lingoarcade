from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "LingoArcade API"
    debug: bool = True
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/lingoarcade"
    secret_key: str = "change-me"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    redis_url: str = "redis://localhost:6379/0"
    openai_api_key: str | None = None
    openai_model: str = "gpt-5"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
