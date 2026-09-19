import json
from typing import AsyncIterable

from fastapi import Depends
from fastapi.routing import APIRouter
from fastapi.sse import EventSourceResponse, ServerSentEvent

from services.mastery_chat import GetTargetArgs, MasteryChatService

router = APIRouter(prefix='/api/mastery_chat')

@router.post('/', response_class=EventSourceResponse)
async def post_messages(
    post_info: GetTargetArgs,
    mastery_chat_service: MasteryChatService = Depends(MasteryChatService),
) -> AsyncIterable[ServerSentEvent]:
    print("🚀 ~ post_messages ~ post_info:", post_info)
    # def event_stream():
    #     for event in mastery_chat_service.get_target(post_info.model_dump()):
    #         yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
    # return StreamingResponse(event_stream(), media_type="text/event-stream")
    for event in mastery_chat_service.get_target(post_info):
        print("🚀 ~ post_messages ~ event:", event)
        yield ServerSentEvent(data=json.dumps(event, ensure_ascii=False))
    