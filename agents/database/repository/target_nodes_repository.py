import uuid
from typing import List

from database.postgres.orm import orm
from database.schemas.target_nodes import TargetNodes
from services.schemas.public import DataStatus, MasteryState


class TargetNodesRepository:
    """学习节点（target_nodes）的数据访问层。"""

    def upsert_node(
        self,
        *,
        node_id: uuid.UUID,
        target_id: uuid.UUID,
        title: str,
        mastery_state: MasteryState,
    ) -> uuid.UUID:
        """按 target_id + title 新增或更新学习节点，返回节点 ID。"""
        with orm.session() as session:
            node = (
                session.query(TargetNodes)
                .filter(
                    TargetNodes.id == node_id,
                )
                .first()
            )
            if node is not None:
                node.title = title
                node.mastery_state = mastery_state
                node.status = DataStatus.ACTIVE
                session.flush()
                return node.id

            session.add(
                TargetNodes(
                    id=node_id,
                    target_id=target_id,
                    title=title,
                    mastery_state=mastery_state,
                    status=DataStatus.ACTIVE,
                )
            )
            session.flush()
            return node_id

    def get_nodes_by_target_id(self, *, target_id: uuid.UUID) -> List[TargetNodes]:
        """按 target_id 查询所有节点，按创建时间排序。"""
        with orm.session() as session:
            return (
                session.query(TargetNodes)
                .filter(TargetNodes.target_id == target_id)
                .order_by(TargetNodes.create_time)
                .all()
            )
