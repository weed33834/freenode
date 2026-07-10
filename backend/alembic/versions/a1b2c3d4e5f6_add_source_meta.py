"""add update_interval and protocols to proxy_sources

Revision ID: a1b2c3d4e5f6
Revises: 952132086a7b
Create Date: 2026-07-09 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '952132086a7b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """给 proxy_sources 加两列：update_interval / protocols（均从 sources.json 同步，仅展示用）。"""
    with op.batch_alter_table('proxy_sources', schema=None) as batch_op:
        batch_op.add_column(sa.Column('update_interval', sa.String(length=16), nullable=True))
        batch_op.add_column(sa.Column('protocols', sa.String(length=128), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('proxy_sources', schema=None) as batch_op:
        batch_op.drop_column('protocols')
        batch_op.drop_column('update_interval')
