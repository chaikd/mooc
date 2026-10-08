import json
import logging
from typing import Any, Callable, Optional, TypedDict, cast
import uuid

from fastapi.sse import ServerSentEvent
from langchain_core.messages import HumanMessage
from langchain_core.runnables import RunnableConfig

from agents_services.agents.chat import chat_agent
from database.repository.message_repository import MessageRepository
from database.repository.target_generated_display_repository import TargetGeneratedDisplayRepository
from database.repository.target_nodes_repository import TargetNodesRepository
from database.repository.target_repository import TargetRepository
from router.common.exception import NotFoundError
from services.schemas.public import ChatRole, ChatType, MasteryState, SSEType, TargetState
from agents_services.agents.summary import title_summary_agent

logger = logging.getLogger(__name__)

class GetTargetArgs(TypedDict):
    user_id: str
    user_input: str
    display_input: Optional[str]
    type: Optional[str]
    target_id: Optional[uuid.UUID]
    target_node_id: Optional[uuid.UUID]


class MasteryChatService:
    def __init__(self) -> None:
        self.chat_agent = chat_agent.get_agent()
        self.message_repo = MessageRepository()
        self.display_repo = TargetGeneratedDisplayRepository()
        self.node_repo = TargetNodesRepository()
        self.target_repo = TargetRepository()

    # ── 消息持久化接口 ───────────────────────────────────────

    def save_message(
        self,
        message_id: uuid.UUID,
        target_id: uuid.UUID,
        content: str,
        role: ChatRole,
    ) -> None:
        """新建一条消息记录。"""
        self.message_repo.save_message(
            message_id=message_id,
            target_id=target_id,
            role=role,
            content=content,
        )

    def update_message(self, message_id: uuid.UUID, content: str) -> None:
        """更新已有消息的内容（用于流式增量写入或完整替换）。"""
        self.message_repo.update_message_content(message_id=message_id, content=content)
    def update_role(self, message_id: uuid.UUID, role: str) -> None:
        """更新已有消息的内容（用于流式增量写入或完整替换）。"""
        self.message_repo.update_message_role(message_id=message_id, role=role)

    def save_generated_display(
        self,
        target_id: uuid.UUID,
        learning_node: str,
        mastery_state: str,
        result: str,
        user_id: str,
        target_node_id: Optional[uuid.UUID] = None,
    ) -> tuple[uuid.UUID, uuid.UUID]:
        """按 target + learning_node 更新节点，并为该节点新增一版展示内容。"""
        title = learning_node.strip() or "未命名学习节点"
        try:
            normalized_mastery_state = MasteryState(mastery_state)
        except (TypeError, ValueError):
            normalized_mastery_state = MasteryState.UNKNOWN

        node_id = self.node_repo.upsert_node(
            node_id=target_node_id or uuid.uuid4(),
            target_id=target_id,
            title=title,
            mastery_state=normalized_mastery_state,
        )
        display_id = uuid.uuid4()
        self.display_repo.save_display(
            display_id=display_id,
            target_node_id=node_id,
            result=result,
        )
        self.target_repo.set_current_node(
            target_id=target_id,
            user_id=user_id,
            node_id=node_id,
        )
        return display_id, node_id
    def update_generated_display_result(self, display_id: uuid.UUID, result: str):
        self.display_repo.update_display_result(
            display_id=display_id,
            result=result,
        )

    def update_node_title(
        self,
        node_id: uuid.UUID,
        target_id: uuid.UUID,
        learning_node: str,
        mastery_state: str,
    ):
        title = learning_node.strip() or "未命名学习节点"
        try:
            normalized_mastery_state = MasteryState(mastery_state)
        except (TypeError, ValueError):
            normalized_mastery_state = MasteryState.UNKNOWN
        self.node_repo.upsert_node(
            node_id=node_id,
            target_id=target_id,
            title=title,
            mastery_state=normalized_mastery_state,
        )
    def update_target_title(
        self,
        target_id: uuid.UUID,
        user_id: str,
        message: str,
    ) -> None:
        """异步生成并更新 target 标题。"""
        title = title_summary_agent.summary(message)
        self.target_repo.update_target(
            target_id=target_id,
            user_id=user_id,
            title=title,
        )

    def _safe_db_op(self, func: Callable[..., Any], **kwargs: Any) -> Any:
        """执行 DB 操作，失败时仅记录日志不抛异常，返回是否成功。"""
        try:
            return func(**kwargs)
        except Exception:
            logger.exception("DB operation failed: %s", func.__name__)
            return False

    # ── Target 解析 ──────────────────────────────────────────

    def _resolve_target(
        self,
        user_id: str,
        target_id: Optional[uuid.UUID],
        user_input: str,
    ) -> tuple[uuid.UUID, bool, TargetState, Optional[uuid.UUID]]:
        """
        解析或创建 target，返回当前目标状态与 current_node_id。
        - target_id 为 None → 生成新 UUID、创建记录、标记 is_new=True
        - target_id 有效 → ensure_target_exists 幂等检查，不存在则创建
        """
        if target_id is None:
            new_id = uuid.uuid4()
            self._safe_db_op(
                self.target_repo.ensure_target_exists,
                target_id=new_id,
                user_id=user_id,
                title=user_input,
                message=user_input,
            )
            self.update_target_title(
                target_id=new_id,
                user_id=user_id,
                message=user_input,
            )
            return new_id, True, TargetState.Node_DISCOVERY, None

        existing = self.target_repo.get_target_by_id(target_id=target_id)
        if existing:
            if existing.user_id != user_id:
                raise NotFoundError("学习目标不存在")
            return target_id, False, existing.target_state, existing.current_node_id

        self._safe_db_op(
            self.target_repo.ensure_target_exists,
            target_id=target_id,
            user_id=user_id,
            title=user_input,
            message=user_input,
        )
        self.update_target_title(
            target_id=target_id,
            user_id=user_id,
            message=user_input,
        )
        return target_id, True, TargetState.Node_DISCOVERY, None

    # ── 流式响应 ─────────────────────────────────────────────

    async def get_target(self, info: GetTargetArgs):
        user_id = info["user_id"]
        user_input = info["user_input"]
        display_input = info.get("display_input") or user_input
        requested_target_node_id = info["target_node_id"] or None
        target_id = info["target_id"]
        input_type = info.get("type") or ChatType.MASTERY_CHAT
        is_learning_action = input_type in (
            ChatType.LEARNING_ACTION,
            ChatType.LEARNING_ACTION.value,
        )

        # 0. 解析或创建 target
        real_target_id, is_new, target_state, current_node_id = self._resolve_target(
            user_id,
            target_id,
            display_input,
        )

        # 节点创建由服务层决定：evaluate_feedback 表示正在回答下一节点确认。
        effective_target_node_id = requested_target_node_id or current_node_id
        if not is_learning_action and target_state == TargetState.EVALUATE_FEEDBACK:
            if "重新" in user_input:
                effective_target_node_id = requested_target_node_id or current_node_id
                self._safe_db_op(
                    self.target_repo.set_target_state,
                    target_id=real_target_id,
                    user_id=user_id,
                    target_state=TargetState.LEARNING,
                )
                target_state = TargetState.LEARNING
            else:
                effective_target_node_id = None
                self._safe_db_op(
                    self.target_repo.set_target_state,
                    target_id=real_target_id,
                    user_id=user_id,
                    target_state=TargetState.Node_DISCOVERY,
                )
                target_state = TargetState.Node_DISCOVERY
        elif target_state == TargetState.Node_DISCOVERY:
            if current_node_id and "重新" in user_input:
                effective_target_node_id = current_node_id
                self._safe_db_op(
                    self.target_repo.set_target_state,
                    target_id=real_target_id,
                    user_id=user_id,
                    target_state=TargetState.LEARNING,
                )
                target_state = TargetState.LEARNING
            else:
                effective_target_node_id = None

        # META：告知前端真实 targetId 及是否新建
        yield ServerSentEvent(
            event=SSEType.META,
            data={"target_id": str(real_target_id), "is_new": is_new},
        )

        # LangGraph 配置
        config: RunnableConfig = {
            "configurable": {"thread_id": str(real_target_id)}
        }
        input_value = cast(Any, {
            "messages": [HumanMessage(content=user_input)],
            "input_type": (
                input_type.value if isinstance(input_type, ChatType) else str(input_type)
            ),
            "learning_action": user_input if is_learning_action else None,
        })

        # 1. 保存用户消息
        user_msg_id = uuid.uuid4()
        self._safe_db_op(
            self.save_message,
            message_id=user_msg_id,
            target_id=real_target_id,
            content=display_input,
            role=ChatRole.USER,
        )

        # 2. 创建空的 assistant 占位消息
        asst_msg_id = uuid.uuid4()
        self._safe_db_op(
            self.save_message,
            message_id=asst_msg_id,
            target_id=real_target_id,
            content="",
            role=ChatRole.ASSISTANT,
        )

        # 3. 流式消费 graph
        display_saved = False

        content_text = ""
        html_text = ""
        # 当前display_id、实际落库的 target_node_id
        target_display_id = None
        generated_node_id = effective_target_node_id
        learning_node = ""
        mastery_state = ""

        async for chunk in self.chat_agent.astream(
            input=input_value,
            config=config,
            stream_mode=["messages", "updates", "custom"],
        ):
            # stream_mode 为列表时，chunk 为 (mode, data) 二元组；data 类型随 mode 变化
            mode, data = cast(tuple[str, Any], chunk)
            if mode == "messages":
                msg_chunk, meta = cast(tuple[Any, dict[str, Any]], data)
                chunk_name = type(msg_chunk).__name__
                node_name = meta.get("langgraph_node", "")
                text = msg_chunk.content if hasattr(msg_chunk, 'content') else str(msg_chunk)
                if not text:
                    continue
                if chunk_name == "AIMessageChunk":
                    if node_name in ("chat_node", "estimate_learning_state_node"):
                        yield ServerSentEvent(event=SSEType.THINKING, raw_data=text)
                        content_text += text
                        self._safe_db_op(
                            self.update_message,
                            message_id=asst_msg_id,
                            content=content_text,
                        )
            elif mode == "custom":
                if (
                    isinstance(data, dict)
                    and data.get("type") == "target_state_change"
                    and data.get("target_state") == TargetState.EVALUATE_FEEDBACK.value
                ):
                    self._safe_db_op(
                        self.target_repo.set_target_state,
                        target_id=real_target_id,
                        user_id=user_id,
                        target_state=TargetState.EVALUATE_FEEDBACK,
                    )
                elif isinstance(data, dict) and data.get("type") == "generated_delta":
                    text = data.get("data") or ""
                    if text:
                        yield ServerSentEvent(event=SSEType.GENERATED, data=text)
                        html_text += text
                        if not display_saved:
                            saved_display = self._safe_db_op(
                                self.save_generated_display,
                                target_id=real_target_id,
                                learning_node=learning_node,
                                mastery_state=mastery_state,
                                result=html_text,
                                target_node_id=effective_target_node_id,
                                user_id=user_id,
                            )
                            if saved_display:
                                target_display_id, generated_node_id = saved_display
                                display_saved = True
                        elif target_display_id:
                            self._safe_db_op(
                                self.update_generated_display_result,
                                display_id=target_display_id,
                                result=html_text,
                            )
            elif mode == "updates":
                if not isinstance(data, dict) or not data:
                    continue
                node_name = list(data.keys())[0]
                the_data = data.get(node_name, {})
                if node_name == "generate_node":
                    # 更新节点learning_node和mastery_status
                    if generated_node_id:
                        self._safe_db_op(
                            self.update_node_title,
                            node_id = generated_node_id,
                            target_id=real_target_id,
                            learning_node=the_data.get("learning_node") or "",
                            mastery_state=the_data.get("mastery_state") or "",
                        )
                elif node_name == "chat_node":
                    learning_node = the_data.get("learning_node") or learning_node
                    mastery_state = the_data.get("mastery_state") or mastery_state
                    if the_data.get("conditions_satisfied") and the_data.get("content_info"):
                        self._safe_db_op(
                            self.update_role,
                            message_id=asst_msg_id,
                            role=ChatRole.THINKING,
                        )
                elif node_name == "continue_node":
                    messages = the_data.get("messages") or []
                    if messages:
                        continuation = messages[-1].content
                        if isinstance(continuation, str) and continuation:
                            content_text += continuation
                            self._safe_db_op(
                                self.update_message,
                                message_id=asst_msg_id,
                                content=content_text,
                            )
                            yield ServerSentEvent(
                                event=SSEType.THINKING,
                                raw_data=continuation,
                            )
                elif node_name == "interrupt_node":
                    question = the_data.get("question") or ""
                    options = the_data.get("options") or []
                    question_content = json.dumps(
                        {"question": question, "options": options},
                        ensure_ascii=False,
                    )
                    self._safe_db_op(
                        self.update_message,
                        message_id=asst_msg_id,
                        content=question_content,
                    )
                    yield ServerSentEvent(
                        event=SSEType.QUESTION,
                        data={"question": question, "options": options},
                    )
        yield ServerSentEvent(event=SSEType.END, data="")
