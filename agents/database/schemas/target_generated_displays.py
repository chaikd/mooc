import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column

from database.schemas.base import Base


class TargetGeneratedDisplays(Base):
    """目标学习节点下 AI 生成的展示内容（如 get_content_show 产出），支持版本历史。"""

    __tablename__ = "target_generated_displays"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True)
    target_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("targets.id"), nullable=False
    )
    result: Mapped[str] = mapped_column(Text)
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    create_time: Mapped[datetime] = mapped_column(default=datetime.now)
    update_time: Mapped[datetime] = mapped_column(
        default=datetime.now, onupdate=datetime.now
    )
