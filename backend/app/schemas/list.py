from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class CreateListRequest(BaseModel):
    name: str
    language: str


class ListResponse(BaseModel):
    id: UUID
    name: str
    language: str
    word_count: int
    weak_word_count: int
    okay_word_count: int
    strong_word_count: int
    created_at: datetime
    last_practiced_at: datetime | None

    class Config:
        from_attributes = True

class UpdateListRequest(BaseModel):
    name: str
    language: str


class LanguageResponse(BaseModel):
    id: UUID
    name: str
    created_at: datetime

    class Config:
        from_attributes = True


class WordResponse(BaseModel):
    id: UUID
    term: str
    definition: str
    fill_blank_sentence: str | None
    practice_attempts: int
    correct_attempts: int
    accuracy: float
    strength: str
    last_practiced_at: datetime | None

    class Config:
        from_attributes = True


class CreateWordRequest(BaseModel):
    term: str
    definition: str


class UpdateWordRequest(BaseModel):
    term: str
    definition: str


class RenameLanguageRequest(BaseModel):
    current_language: str
    new_language: str


class CreateLanguageRequest(BaseModel):
    language: str


class DeleteLanguageRequest(BaseModel):
    language: str


class QuizResultItem(BaseModel):
    word_id: UUID
    is_correct: bool


class RecordWordPerformanceRequest(BaseModel):
    results: list[QuizResultItem]


class RecordWordPracticeRequest(BaseModel):
    word_ids: list[UUID]


# OpenAI fill-in-the-blank generation is paused while we think through the AI direction.
# class GenerateFillBlankSentencesRequest(BaseModel):
#     word_ids: list[UUID]
