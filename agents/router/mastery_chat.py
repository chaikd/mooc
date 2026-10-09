import asyncio
import uuid
from typing import AsyncIterable, Optional

from fastapi import Depends
from fastapi.routing import APIRouter
from fastapi.sse import EventSourceResponse, ServerSentEvent
from langchain_core.exceptions import (
    ModelAPIError,
    ModelConnectionError,
    ModelRateLimitError,
    ModelTimeoutError,
)
from langchain_openai import StreamChunkTimeoutError
from langgraph.errors import NodeTimeoutError
from pydantic import BaseModel

from router.common.auth import CurrentUserId
from router.common.exception import DomainException
from router.common.exception_handler import build_error_payload
from services.mastery_chat import GetTargetArgs, MasteryChatService
from services.schemas.public import ChatType, SSEType
from utils.logger_tool import logger

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
        async for event in mastery_chat_service.get_target(args):
            yield event
    except asyncio.CancelledError:
        raise
    except NodeTimeoutError as exc:
        logger.error("Agent node timeout: node=%s kind=%s", exc.node, exc.kind)
        yield ServerSentEvent(
            event=SSEType.ERROR,
            data=build_error_payload(
                code="AGENT_NODE_TIMEOUT",
                message="生成超时，请重试",
                details={
                    "node": exc.node,
                    "kind": exc.kind,
                    "timeout": exc.timeout,
                    "elapsed": exc.elapsed,
                },
            ),
        )
    except ModelTimeoutError as exc:
        logger.error("LLM timeout: %s", exc, exc_info=True)
        yield ServerSentEvent(
            event=SSEType.ERROR,
            data=build_error_payload(
                code="LLM_TIMEOUT",
                message="模型响应超时，请重试",
            ),
        )
    except StreamChunkTimeoutError as exc:
        logger.error("LLM stream idle timeout: %s", exc, exc_info=True)
        yield ServerSentEvent(
            event=SSEType.ERROR,
            data=build_error_payload(
                code="LLM_STREAM_IDLE_TIMEOUT",
                message="模型长时间未返回内容，请重试",
            ),
        )
    except (ModelConnectionError, ModelRateLimitError, ModelAPIError) as exc:
        logger.error("LLM request failed: %s", exc, exc_info=True)
        yield ServerSentEvent(
            event=SSEType.ERROR,
            data=build_error_payload(
                code="LLM_REQUEST_ERROR",
                message="模型服务暂时不可用，请稍后重试",
            ),
        )
    except TimeoutError as exc:
        logger.error("Agent total timeout: %s", exc, exc_info=True)
        yield ServerSentEvent(
            event=SSEType.ERROR,
            data=build_error_payload(
                code="AGENT_TOTAL_TIMEOUT",
                message="本次生成超时，请重试",
            ),
        )
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
