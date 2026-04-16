import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class VocabularyWord(Base):
    __tablename__ = "vocabulary_words"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    list_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("vocabulary_lists.id", ondelete="CASCADE"),
        nullable=False,
    )
    term: Mapped[str] = mapped_column(String(255), nullable=False)
    definition: Mapped[str] = mapped_column(Text, nullable=False)
    practice_attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    correct_attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    strength: Mapped[str] = mapped_column(String(20), nullable=False, default="weak", server_default="weak")
    last_practiced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    vocabulary_list = relationship("VocabularyList", back_populates="words")

    @property
    def accuracy(self) -> float:
        if self.practice_attempts == 0:
            return 0.0

        return self.correct_attempts / self.practice_attempts
