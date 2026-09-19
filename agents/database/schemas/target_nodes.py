import uuid
from datetime import datetime

from sqlalchemy import Enum, ForeignKeyConstraint, Text
from sqlalchemy.orm import Mapped, mapped_column

from database.schemas.base import Base
from services.schemas.public import MasteryState


class TargetNodes(Base):
    __tablename__ = "target_nodes"
    # 循环外键（targets ↔ target_nodes）：使用 use_alter 延迟添加，避免建表拓扑排序卡死
    __table_args__ = (
        ForeignKeyConstraint(
            ["target_id"], ["targets.id"],
            use_alter=True,
            name="fk_target_nodes_target",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True)
    target_id: Mapped[uuid.UUID] = mapped_column(nullable=False)
    title: Mapped[str] = mapped_column(Text)
    # 绑定 MasteryState 枚举：自动生成 CHECK 约束，读写时自动 (反)序列化
    mastery_state: Mapped[MasteryState] = mapped_column(
        Enum(MasteryState, name="mastery_state")
    )
    status: Mapped[str] = mapped_column(Text)
    html: Mapped[str] = mapped_column(Text)
    create_time: Mapped[datetime] = mapped_column(default=datetime.now)
    update_time: Mapped[datetime] = mapped_column(
        default=datetime.now, onupdate=datetime.now
    )
    