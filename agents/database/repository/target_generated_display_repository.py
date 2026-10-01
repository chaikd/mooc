import uuid
from typing import Optional

from sqlalchemy import func, update

from database.postgres.orm import orm
from database.schemas.target_generated_displays import TargetGeneratedDisplays


class TargetGeneratedDisplayRepository:
    """AI 生成展示内容的数据访问层，支持同一学习节点下的版本递增。"""

    def save_display(
        self,
        *,
        display_id: uuid.UUID,
        target_node_id: uuid.UUID,
        result: str,
    ) -> None:
        """新增一条生成内容记录，version 自动在当前 target_node_id 下递增。"""
        with orm.session() as session:
            max_version = (
                session.query(func.max(TargetGeneratedDisplays.version))
                .filter(TargetGeneratedDisplays.target_node_id == target_node_id)
                .scalar()
            ) or 0
            session.add(
                TargetGeneratedDisplays(
                    id=display_id,
                    target_node_id=target_node_id,
                    result=result,
                    version=max_version + 1,
                )
            )

    def update_display_result(
            self,
            *,
            display_id: uuid.UUID,
            result: str,
        ) -> None:
            """新增一条生成内容记录，version 自动在当前 target_node_id 下递增。"""
            with orm.session() as session:
                session.execute(
                    update(TargetGeneratedDisplays)
                    .where(TargetGeneratedDisplays.id == display_id)
                    .values(result=result)
                )

    def get_latest_display_by_node_id(
        self,
        *,
        target_node_id: uuid.UUID,
    ) -> Optional[TargetGeneratedDisplays]:
        """查询指定学习节点下版本号最高的展示内容。"""
        with orm.session() as session:
            return (
                session.query(TargetGeneratedDisplays)
                .filter(TargetGeneratedDisplays.target_node_id == target_node_id)
                .order_by(TargetGeneratedDisplays.version.desc())
                .first()
            )
