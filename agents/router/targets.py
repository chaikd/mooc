import uuid
from typing import List, Optional

from fastapi import Depends, Query
from fastapi.routing import APIRouter
from pydantic import BaseModel, Field

from router.common.auth import CurrentUserId
from router.common.exception import NotFoundError
from services.mastery_chat import MasteryChatService


# ── Response Models（camelCase via alias）──────────────────────

class TargetResponse(BaseModel):
    id: str
    title: str
    masteryState: Optional[str] = None
    state: str
    currentNodeId: Optional[str] = None


class TargetNodeResponse(BaseModel):
    id: str
    targetId: str
    title: str
    masteryState: Optional[str] = None
    result: Optional[str] = None


class TargetSummaryResponse(BaseModel):
    id: str
    title: str
    masteryState: Optional[str] = None
    state: str
    currentNodeId: Optional[str] = None
    updatedAt: int


class MessageResponse(BaseModel):
    id: str
    role: str
    content: str
    status: str = "sent"
    createdAt: int = Field(alias="create_time")

    class Config:
        populate_by_name = True


class NodeDisplayResponse(BaseModel):
    nodeId: str = Field(alias="node_id")
    result: str
    version: int

    class Config:
        populate_by_name = True


router = APIRouter(prefix='/api/targets')


# ── Endpoints ─────────────────────────────────────────────────

@router.get('', response_model=List[TargetSummaryResponse])
async def get_targets(
    user_id: CurrentUserId,
    limit: int = Query(default=6, ge=1, le=20),
    mastery_chat_service: MasteryChatService = Depends(MasteryChatService),
):
    """获取最近更新的学习主题。"""
    targets = mastery_chat_service.target_repo.get_recent_targets(
        user_id=user_id,
        limit=limit,
    )
    return [
        TargetSummaryResponse(
            id=str(target.id),
            title=target.title,
            masteryState=target.mastery_state.value if target.mastery_state else None,
            state=target.target_state.value,
            currentNodeId=str(target.current_node_id) if target.current_node_id else None,
            updatedAt=int(target.update_time.timestamp() * 1000),
        )
        for target in targets
    ]


@router.get('/{target_id}', response_model=TargetResponse)
async def get_target(
    target_id: uuid.UUID,
    user_id: CurrentUserId,
    mastery_chat_service: MasteryChatService = Depends(MasteryChatService),
):
    """获取单个学习目标详情。"""
    target = mastery_chat_service.target_repo.get_target_by_id(
        target_id=target_id,
        user_id=user_id,
    )
    if not target:
        raise NotFoundError("学习目标不存在")
    return TargetResponse(
        id=str(target.id),
        title=target.title,
        masteryState=target.mastery_state.value if target.mastery_state else None,
        state=target.target_state.value,
        currentNodeId=str(target.current_node_id) if target.current_node_id else None,
    )


@router.get('/{target_id}/nodes', response_model=List[TargetNodeResponse])
async def get_nodes(
    target_id: uuid.UUID,
    user_id: CurrentUserId,
    mastery_chat_service: MasteryChatService = Depends(MasteryChatService),
):
    """获取目标下的所有学习节点。"""
    target = mastery_chat_service.target_repo.get_target_by_id(
        target_id=target_id,
        user_id=user_id,
    )
    if not target:
        raise NotFoundError("学习目标不存在")
    nodes = mastery_chat_service.node_repo.get_nodes_by_target_id(target_id=target_id)
    return [
        TargetNodeResponse(
            id=str(n.id),
            targetId=str(n.target_id),
            title=n.title,
            masteryState=n.mastery_state.value if n.mastery_state else None,
            # result=n.result,
        )
        for n in nodes
    ]


@router.get('/nodes/{node_id}/latest-display', response_model=NodeDisplayResponse)
async def get_latest_node_display(
    node_id: uuid.UUID,
    user_id: CurrentUserId,
    mastery_chat_service: MasteryChatService = Depends(MasteryChatService),
):
    """获取指定学习节点最新版本的生成内容。"""
    display = mastery_chat_service.display_repo.get_latest_display_by_node_id(
        target_node_id=node_id,
        user_id=user_id,
    )
    if not display:
        raise NotFoundError("该节点尚未生成学习内容")
    return NodeDisplayResponse(
        node_id=str(display.target_node_id),
        result=display.result,
        version=display.version,
    )


@router.get('/{target_id}/messages', response_model=List[MessageResponse])
async def get_messages(
    target_id: uuid.UUID,
    user_id: CurrentUserId,
    mastery_chat_service: MasteryChatService = Depends(MasteryChatService),
):
    """获取目标下的所有聊天消息。"""
    target = mastery_chat_service.target_repo.get_target_by_id(
        target_id=target_id,
        user_id=user_id,
    )
    if not target:
        raise NotFoundError("学习目标不存在")
    messages = mastery_chat_service.message_repo.get_messages_by_target_id(target_id=target_id)
    return [
        MessageResponse(
            id=str(m.id),
            role=m.role.value if m.role else "assistant",
            content=m.content,
            create_time=int(m.create_time.timestamp() * 1000),
        )
        for m in messages
    ]
