"""add word performance fields

Revision ID: 9d4e7b2c1a11
Revises: c0f9d7a8f2b1
Create Date: 2026-04-16 14:20:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "9d4e7b2c1a11"
down_revision: Union[str, Sequence[str], None] = "c0f9d7a8f2b1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "vocabulary_words",
        sa.Column("practice_attempts", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "vocabulary_words",
        sa.Column("correct_attempts", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "vocabulary_words",
        sa.Column("strength", sa.String(length=20), nullable=False, server_default="weak"),
    )
    op.add_column(
        "vocabulary_words",
        sa.Column("last_practiced_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("vocabulary_words", "last_practiced_at")
    op.drop_column("vocabulary_words", "strength")
    op.drop_column("vocabulary_words", "correct_attempts")
    op.drop_column("vocabulary_words", "practice_attempts")
