import uuid
from datetime import datetime
from typing import List

from sqlalchemy import update

from database.postgres.orm import orm
from database.schemas.messages import Messages
from services.schemas.public import ChatRole

class MessageRepository:
    """消息数据访问层，封装 messages 表的持久化操作。"""

    def save_message(
        self,
        *,
        message_id: uuid.UUID,
        target_id: uuid.UUID,
        role: ChatRole,
        content: str,
    ) -> None:
        with orm.session() as session:
            session.add(
                Messages(
                    id=message_id,
                    target_id=target_id,
                    role=role,
                    content=content,
                )
            )

    def update_message_content(self, *, message_id: uuid.UUID, content: str) -> None:
        """按 id 更新消息内容，用于流式增量写入或完整替换。"""
        with orm.session() as session:
            session.execute(
                update(Messages)
                .where(Messages.id == message_id)
                .values(content=content, update_time=datetime.now())
            )

    def get_messages_by_target_id(self, *, target_id: uuid.UUID) -> List[Messages]:
        """按 target_id 查询所有消息，按创建时间排序。"""
        with orm.session() as session:
            return (
                session.query(Messages)
                .filter(Messages.target_id == target_id)
                .order_by(Messages.create_time)
                .all()
            )