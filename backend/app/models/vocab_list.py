import uuid
from datetime import datetime

from sqlalchemy import String, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class VocabularyList(Base):
    __tablename__ = "vocabulary_lists"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    name: Mapped[str] = mapped_column(String(255))
    language: Mapped[str] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    words = relationship(
        "VocabularyWord",
        back_populates="vocabulary_list",
        cascade="all, delete-orphan",
    )

    @property
    def word_count(self) -> int:
        return len(self.words)

    @property
    def weak_word_count(self) -> int:
        return sum(1 for word in self.words if word.strength == "weak")

    @property
    def okay_word_count(self) -> int:
        return sum(1 for word in self.words if word.strength == "okay")

    @property
    def strong_word_count(self) -> int:
        return sum(1 for word in self.words if word.strength == "strong")

    @property
    def last_practiced_at(self) -> datetime | None:
        practiced_words = [
            word.last_practiced_at for word in self.words if word.last_practiced_at is not None
        ]
        if not practiced_words:
            return None

        return max(practiced_words)
