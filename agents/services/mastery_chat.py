import json
import logging
import time
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
from services.schemas.public import ChatRole, SSEType
from agents_services.agents.summary import title_summary_agent

logger = logging.getLogger(__name__)

# 节流参数：TOKEN 阶段累积写入 DB 的频率控制
_FLUSH_INTERVAL = 0.5      # 最小刷新间隔（秒）
_FLUSH_TOKEN_COUNT = 20    # 最少累积 token 数才触发刷新


class GetTargetArgs(TypedDict):
    user_input: str
    target_id: Optional[uuid.UUID]


class MasteryChatService:
    def __init__(self) -> None:
        self.chat_agent = chat_agent
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

    def save_generated_display(
        self,
        display_id: uuid.UUID,
        target_id: uuid.UUID,
        result: str,
    ) -> None:
        """保存 AI 生成的展示内容（get_content_show 产出），自动递增版本。"""
        self.display_repo.save_display(
            display_id=display_id,
            target_id=target_id,
            result=result,
        )

    def update_target_title(self, target_id: uuid.UUID, message: str) -> None:
        """异步生成并更新 target 标题。"""
        title = title_summary_agent.summary(message)
        self.target_repo.update_target(target_id=target_id, title=title)

    def _safe_db_op(self, func: Callable[..., Any], **kwargs: Any) -> bool:
        """执行 DB 操作，失败时仅记录日志不抛异常，返回是否成功。"""
        try:
            func(**kwargs)
            return True
        except Exception:
            logger.exception("DB operation failed: %s", func.__name__)
            return False

    # ── Target 解析 ──────────────────────────────────────────

    def _resolve_target(
        self, target_id: Optional[uuid.UUID], user_input: str
    ) -> tuple[uuid.UUID, bool]:
        """
        解析或创建 target，返回 (real_target_id, is_new)。
        - target_id 为 None → 生成新 UUID、创建记录、标记 is_new=True
        - target_id 有效 → ensure_target_exists 幂等检查，不存在则创建
        """
        if target_id is None:
            new_id = uuid.uuid4()
            self._safe_db_op(
                self.target_repo.ensure_target_exists,
                target_id=new_id,
                title=user_input,
                message=user_input,
            )
            self.update_target_title(target_id=new_id, message=user_input)
            return new_id, True

        existed = self.target_repo.ensure_target_exists(
            target_id=target_id,
            title=user_input,
            message=user_input,
        )
        if not existed:
            self.update_target_title(target_id=target_id, message=user_input)
        return target_id, not existed

    # ── 流式响应 ─────────────────────────────────────────────

    def get_target(self, info: GetTargetArgs):
        user_input = info["user_input"]

        # 0. 解析或创建 target
        real_target_id, is_new = self._resolve_target(info.get("target_id"), user_input)

        # META：告知前端真实 targetId 及是否新建
        yield ServerSentEvent(
            event=SSEType.META,
            data={"target_id": str(real_target_id), "is_new": is_new},
        )

        # LangGraph 配置
        config: RunnableConfig = {
            "configurable": {"thread_id": str(real_target_id)}
        }
        input_value = cast(Any, {"messages": [HumanMessage(content=user_input)]})

        # 1. 保存用户消息
        user_msg_id = uuid.uuid4()
        self._safe_db_op(
            self.save_message,
            message_id=user_msg_id,
            target_id=real_target_id,
            content=user_input,
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
        accumulated = ""
        last_flush_time = time.monotonic()
        tokens_since_flush = 0
        pending = False
        question_sent = False
        display_saved = False

        for chunk in self.chat_agent.stream(
            input=input_value,
            config=config,
            stream_mode=["messages", "values"],
        ):
            # stream_mode 为列表时，chunk 为 (mode, data) 二元组；data 类型随 mode 变化
            mode, data = cast(tuple[str, Any], chunk)

            if mode == "messages":
                msg_chunk, meta = cast(tuple[Any, dict[str, Any]], data)
                node_name = meta.get("langgraph_node", "")
                if node_name in ("chat_node", "get_content_show"):
                    text = msg_chunk.content if hasattr(msg_chunk, 'content') else str(msg_chunk)
                    if text:
                        accumulated += text
                        tokens_since_flush += 1
                        pending = True

                        # 节流刷新
                        now = time.monotonic()
                        if (tokens_since_flush >= _FLUSH_TOKEN_COUNT
                                and now - last_flush_time >= _FLUSH_INTERVAL):
                            self._safe_db_op(
                                self.update_message,
                                message_id=asst_msg_id,
                                content=accumulated,
                            )
                            last_flush_time = now
                            tokens_since_flush = 0
                            pending = False

                        yield ServerSentEvent(event=SSEType.TOKEN, data=text)

            elif mode == "values":
                state = cast(dict[str, Any], data)

                # get_content_show 完成：保存生成内容
                if not display_saved and state.get("result") is not None:
                    result_value = state["result"]
                    result_str = (
                        result_value if isinstance(result_value, str)
                        else json.dumps(result_value, ensure_ascii=False)
                    )
                    self._safe_db_op(
                        self.save_generated_display,
                        display_id=uuid.uuid4(),
                        target_id=real_target_id,
                        result=result_str,
                    )
                    display_saved = True

                # chat_node 结束且条件不满足：发送 question
                if not question_sent and not state.get("conditions_satisfied", True):
                    question = state.get("question", "")
                    options = state.get("options", [])
                    if question:
                        question_content = json.dumps(
                            {"question": question, "options": options},
                            ensure_ascii=False,
                        )
                        accumulated = question_content
                        self._safe_db_op(
                            self.update_message,
                            message_id=asst_msg_id,
                            content=question_content,
                        )
                        pending = False
                        tokens_since_flush = 0
                        last_flush_time = time.monotonic()

                        yield ServerSentEvent(
                            event=SSEType.QUESTION,
                            data={"question": question, "options": options},
                        )
                        question_sent = True

        # 最终 flush
        if pending:
            self._safe_db_op(
                self.update_message,
                message_id=asst_msg_id,
                content=accumulated,
            )

        yield ServerSentEvent(event=SSEType.END, data="")
