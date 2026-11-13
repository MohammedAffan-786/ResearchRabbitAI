"""Add refresh token, document jobs, research activities, paper intelligence, and share tokens

Revision ID: a8160eec1a5a
Revises: 7f8ec9cd42a4
Create Date: 2026-11-13 21:15:03.513611

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a8160eec1a5a'
down_revision: Union[str, Sequence[str], None] = '7f8ec9cd42a4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('papers', schema=None) as batch_op:
        batch_op.create_foreign_key('fk_papers_uploader_id', 'users', ['uploader_id'], ['id'], ondelete='SET NULL')

    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('refresh_token', sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('refresh_token')

    with op.batch_alter_table('papers', schema=None) as batch_op:
        batch_op.drop_constraint('fk_papers_uploader_id', type_='foreignkey')
