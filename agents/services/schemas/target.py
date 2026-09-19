from enum import Enum
from typing import Literal
import uuid

from pydantic import BaseModel

from services.schemas.public import DataStatus, MasteryState

class TargetInfo(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID | None = None
    current_node_id: uuid.UUID
    title: str
    create_time: str | None = None
    update_time: str | None = None
    status: DataStatus = DataStatus.ACTIVE
    first_sentence: str
    conversation_id: str | None = None

class TargetNodeInfo(BaseModel):
    id: uuid.UUID
    target_id: uuid.UUID | None = None
    title: str
    create_time: str | None = None
    update_time: str | None = None
    html: str
    mastery_state:MasteryState = MasteryState.NOT_CONTACTED
    status: DataStatus = DataStatus.ACTIVE