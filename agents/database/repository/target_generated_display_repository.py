import uuid

from sqlalchemy import func

from database.postgres.orm import orm
from database.schemas.target_generated_displays import TargetGeneratedDisplays


class TargetGeneratedDisplayRepository:
    """AI 生成展示内容的数据访问层，支持同一 target 下的版本递增。"""

    def save_display(
        self,
        *,
        display_id: uuid.UUID,
        target_id: uuid.UUID,
        result: str,
    ) -> None:
        """新增一条生成内容记录，version 自动在该 target_id 下递增。"""
        with orm.session() as session:
            max_version = (
                session.query(func.max(TargetGeneratedDisplays.version))
                .filter(TargetGeneratedDisplays.target_id == target_id)
                .scalar()
            ) or 0
            session.add(
                TargetGeneratedDisplays(
                    id=display_id,
                    target_id=target_id,
                    result=result,
                    version=max_version + 1,
                )
            )
