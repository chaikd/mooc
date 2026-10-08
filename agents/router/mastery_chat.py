import uuid
import logging
from typing import AsyncIterable, Optional

from fastapi import Depends
from fastapi.routing import APIRouter
from fastapi.sse import EventSourceResponse, ServerSentEvent
from pydantic import BaseModel

from router.common.auth import CurrentUserId
from router.common.exception import DomainException
from router.common.exception_handler import build_error_payload
from services.mastery_chat import GetTargetArgs, MasteryChatService
from services.schemas.public import ChatType, SSEType

logger = logging.getLogger(__name__)

class ChatRequest(BaseModel):
    user_input: str
    type: Optional[ChatType] = ChatType.MASTERY_CHAT
    display_input: Optional[str] = None
    target_node_id: Optional[uuid.UUID] = None
    target_id: Optional[uuid.UUID] = None


router = APIRouter(prefix='/api/mastery_chat')

@router.post('/', response_class=EventSourceResponse)
async def post_messages(
    post_info: ChatRequest,
    user_id: CurrentUserId,
    mastery_chat_service: MasteryChatService = Depends(MasteryChatService),
) -> AsyncIterable[ServerSentEvent]:
    try:
        args: GetTargetArgs = {
            "user_id": user_id,
            "user_input": post_info.user_input,
            "display_input": post_info.display_input,
            "target_id": post_info.target_id,
            "target_node_id": post_info.target_node_id,
            "type": post_info.type
        }
        for event in mastery_chat_service.get_target(args):
            yield event
    except DomainException as exc:
        logger.error("DomainException:", exc, exc_info=True)
        yield ServerSentEvent(
            event=SSEType.ERROR,
            data=build_error_payload(
                code=exc.code,
                message=exc.message,
                details=exc.details,
            ),
        )
    except Exception as e :
        logger.error("SSE stream failed:", e, exc_info=True)
        yield ServerSentEvent(
            event=SSEType.ERROR,
            data=build_error_payload(
                code="INTERNAL_ERROR",
                message="服务器内部错误",
            ),
        )
