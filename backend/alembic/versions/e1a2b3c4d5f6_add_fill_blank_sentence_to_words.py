"""add fill blank sentence to words

Revision ID: e1a2b3c4d5f6
Revises: 9d4e7b2c1a11
Create Date: 2026-04-19 20:30:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "e1a2b3c4d5f6"
down_revision: Union[str, Sequence[str], None] = "9d4e7b2c1a11"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "vocabulary_words",
        sa.Column("fill_blank_sentence", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("vocabulary_words", "fill_blank_sentence")
