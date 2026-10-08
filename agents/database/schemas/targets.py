import uuid
from datetime import datetime

from sqlalchemy import Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from database.schemas.base import Base
from services.schemas.public import DataStatus, MasteryState, TargetState


class Targets(Base):
    __tablename__ = "targets"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True)
    user_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    title: Mapped[str] = mapped_column(Text)
    first_message: Mapped[str] = mapped_column(Text)
    # 绑定 MasteryState 枚举：自动生成 CHECK 约束，读写时自动 (反)序列化
    mastery_state: Mapped[MasteryState] = mapped_column(
        Enum(MasteryState, name="mastery_state"),
        default=MasteryState.UNKNOWN
    )
    target_state: Mapped[TargetState] = mapped_column(
        Enum(TargetState, name="target_state"),
        default=TargetState.Node_DISCOVERY,
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        Enum(DataStatus, name="status"),
        default=DataStatus.ACTIVE
    )
    current_node_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("target_nodes.id"), nullable=True
    )
    create_time: Mapped[datetime] = mapped_column(default=datetime.now)
    update_time: Mapped[datetime] = mapped_column(
        default=datetime.now, onupdate=datetime.now
    )
