import uuid
from typing import AsyncIterable, Optional

from fastapi import Depends
from fastapi.routing import APIRouter
from fastapi.sse import EventSourceResponse, ServerSentEvent
from pydantic import BaseModel

from services.mastery_chat import GetTargetArgs, MasteryChatService


class ChatRequest(BaseModel):
    user_input: str
    target_id: Optional[uuid.UUID] = None


router = APIRouter(prefix='/api/mastery_chat')

@router.post('/', response_class=EventSourceResponse)
async def post_messages(
    post_info: ChatRequest,
    mastery_chat_service: MasteryChatService = Depends(MasteryChatService),
) -> AsyncIterable[ServerSentEvent]:
    args: GetTargetArgs = {
        "user_input": post_info.user_input,
        "target_id": post_info.target_id,
    }
    for event in mastery_chat_service.get_target(args):
        yield event
