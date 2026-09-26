import uuid
from typing import List

from database.postgres.orm import orm
from database.schemas.target_nodes import TargetNodes


class TargetNodesRepository:
    """学习节点（target_nodes）的数据访问层。"""

    def get_nodes_by_target_id(self, *, target_id: uuid.UUID) -> List[TargetNodes]:
        """按 target_id 查询所有节点，按创建时间排序。"""
        with orm.session() as session:
            return (
                session.query(TargetNodes)
                .filter(TargetNodes.target_id == target_id)
                .order_by(TargetNodes.create_time)
                .all()
            )
