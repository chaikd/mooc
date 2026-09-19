import uuid
from datetime import datetime

from sqlalchemy import Enum, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column

from database.schemas.base import Base
from services.schemas.public import ChatRole


class Messages(Base):
    __tablename__ = "messages"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True)
    target_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("targets.id"), nullable=False
    )
    role: Mapped[ChatRole] = mapped_column(Enum(ChatRole, name="chat_role"))
    content: Mapped[str] = mapped_column(Text)
    create_time: Mapped[datetime] = mapped_column(default=datetime.now)
    update_time: Mapped[datetime] = mapped_column(
        default=datetime.now, onupdate=datetime.now
    )
