from datetime import datetime
import uuid
from typing import List, Optional

from database.postgres.orm import orm
from database.schemas.targets import Targets
from services.schemas.public import DataStatus
from sqlalchemy import update

class TargetRepository:
    """目标（targets）的数据访问层。"""

    def get_target_by_id(
        self,
        *,
        target_id: uuid.UUID,
        user_id: Optional[str] = None,
    ) -> Optional[Targets]:
        """根据 ID 查询单个 target，不存在返回 None。"""
        with orm.session() as session:
            query = session.query(Targets).filter(Targets.id == target_id)
            if user_id is not None:
                query = query.filter(Targets.user_id == user_id)
            return query.first()

    def get_recent_targets(self, *, user_id: str, limit: int = 6) -> List[Targets]:
        """查询最近更新的、已经生成学习内容的学习主题。"""
        with orm.session() as session:
            return (
                session.query(Targets)
                .filter(Targets.user_id == user_id)
                .filter(Targets.status == DataStatus.ACTIVE)
                .filter(Targets.current_node_id.is_not(None))
                .order_by(Targets.update_time.desc())
                .limit(limit)
                .all()
            )

    def ensure_target_exists(
        self,
        *,
        target_id: uuid.UUID,
        user_id: str,
        title: str,
        message: str,
    ) -> bool:
        """确保 targets 表存在对应记录，不存在则新增一条最小记录（幂等）。"""
        with orm.session() as session:
            exists = session.query(Targets.id).filter(Targets.id == target_id).first()
            if not exists:
                session.add(Targets(
                    id=target_id,
                    user_id=user_id,
                    title=title,
                    first_message=message
                ))
        return bool(exists)

    def update_target(
        self,
        *,
        target_id: uuid.UUID,
        user_id: str,
        title: str,
    ) -> None:
        with orm.session() as session:
            session.execute(
                update(Targets)
                .where(Targets.id == target_id, Targets.user_id == user_id)
                .values(title=title, update_time=datetime.now())
            )

    def set_current_node(
        self,
        *,
        target_id: uuid.UUID,
        user_id: str,
        node_id: uuid.UUID,
    ) -> None:
        """更新 target 当前正在学习的目标节点。"""
        with orm.session() as session:
            session.execute(
                update(Targets)
                .where(Targets.id == target_id, Targets.user_id == user_id)
                .values(current_node_id=node_id, update_time=datetime.now())
            )
