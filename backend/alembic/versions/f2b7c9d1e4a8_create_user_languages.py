"""create user languages

Revision ID: f2b7c9d1e4a8
Revises: e1a2b3c4d5f6
Create Date: 2026-04-28 00:00:00.000000
"""

from typing import Sequence, Union
import uuid

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f2b7c9d1e4a8"
down_revision: Union[str, Sequence[str], None] = "e1a2b3c4d5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user_languages",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "name", name="uq_user_languages_user_id_name"),
    )

    connection = op.get_bind()
    existing_languages = connection.execute(
        sa.text(
            """
            SELECT DISTINCT user_id, language
            FROM vocabulary_lists
            WHERE language IS NOT NULL AND language <> ''
            """
        )
    ).all()

    if existing_languages:
        user_languages_table = sa.table(
            "user_languages",
            sa.column("id", sa.UUID()),
            sa.column("user_id", sa.UUID()),
            sa.column("name", sa.String()),
        )
        op.bulk_insert(
            user_languages_table,
            [
                {
                    "id": uuid.uuid4(),
                    "user_id": row.user_id,
                    "name": row.language,
                }
                for row in existing_languages
            ],
        )


def downgrade() -> None:
    op.drop_table("user_languages")
