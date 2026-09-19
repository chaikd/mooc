from datetime import datetime
import uuid

from database.postgres.orm import orm
from database.schemas.targets import Targets
from sqlalchemy import update

class TargetRepository:
    """目标（targets）的数据访问层。"""

    def ensure_target_exists(self, *, target_id: uuid.UUID, title: str, message: str) -> bool:
        """确保 targets 表存在对应记录，不存在则新增一条最小记录（幂等）。"""
        with orm.session() as session:
            exists = session.query(Targets.id).filter(Targets.id == target_id).first()
            if not exists:
                session.add(Targets(
                    id=target_id,
                    title=title,
                    first_message=message
                ))
        return bool(exists)

    def update_target(self, *, target_id: uuid.UUID, title: str) -> None:
        with orm.session() as session:
            session.execute(
                update(Targets)
                .where(Targets.id == target_id)
                .values(title=title, update_time=datetime.now())
            )