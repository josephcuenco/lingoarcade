from uuid import UUID

from pydantic import BaseModel


class CreateListRequest(BaseModel):
    name: str
    language: str


class ListResponse(BaseModel):
    id: UUID
    name: str
    language: str

    class Config:
        from_attributes = True

class UpdateListRequest(BaseModel):
    name: str
    language: str


class RenameLanguageRequest(BaseModel):
    current_language: str
    new_language: str


class DeleteLanguageRequest(BaseModel):
    language: str
