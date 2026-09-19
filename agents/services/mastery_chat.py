import json
import logging
import time
from typing import Any, Callable, TypedDict, cast
import uuid

from langchain_core.messages import HumanMessage
from langchain_core.runnables import RunnableConfig

from agents_services.agents.chat import chat_agent
from database.repository.message_repository import MessageRepository
from database.repository.target_generated_display_repository import TargetGeneratedDisplayRepository
from database.repository.target_repository import TargetRepository
from services.schemas.public import ChatRole, SSEType
from agents_services.agents.summary import title_summary_agent

logger = logging.getLogger(__name__)

# 节流参数：TOKEN 阶段累积写入 DB 的频率控制
_FLUSH_INTERVAL = 0.5      # 最小刷新间隔（秒）
_FLUSH_TOKEN_COUNT = 20    # 最少累积 token 数才触发刷新


class GetTargetArgs(TypedDict):
    user_input: str
    target_id: uuid.UUID


class MasteryChatService:
    def __init__(self) -> None:
        self.chat_agent = chat_agent
        self.message_repo = MessageRepository()
        self.display_repo = TargetGeneratedDisplayRepository()
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

    # 异步更新target_title
    def update_target_title(self, target_id: uuid.UUID, message: str):
        title = title_summary_agent.summary(message)
        self.target_repo.update_target(target_id=target_id, title = title)
    
    def ensure_target(self, target_id: uuid.UUID, title: str, message: str) -> None:
        """确保 targets 表存在对应记录，不存在则新增（幂等）。"""
        exists = self.target_repo.ensure_target_exists(
            target_id=target_id,
            title=title,
            message=message
        )
        if not exists:
            self.update_target_title(target_id=target_id, message=message)

    def _safe_db_op(self, func: Callable[..., None], **kwargs: Any) -> bool:
        """执行 DB 操作，失败时仅记录日志不抛异常，返回是否成功。"""
        try:
            func(**kwargs)
            return True
        except Exception:
            logger.exception("DB operation failed: %s", func.__name__)
            return False

    # ── 流式响应 ─────────────────────────────────────────────

    def get_target(self, info: GetTargetArgs):
        config: RunnableConfig = {
            "configurable": {
                "thread_id": str(info["target_id"])
            }
        }
        input_value = cast(Any, {"messages": [HumanMessage(content=info["user_input"])]})

        # 0. 确保 target 存在，避免 message 外键失败
        self._safe_db_op(self.ensure_target, target_id=info["target_id"], title=info["user_input"], message=info["user_input"])

        # 1. 保存用户消息
        user_msg_id = uuid.uuid4()
        self._safe_db_op(
            self.save_message,
            message_id=user_msg_id,
            target_id=info["target_id"],
            content=info["user_input"],
            role=ChatRole.USER,
        )

        # 2. 创建空的 assistant 占位消息
        asst_msg_id = uuid.uuid4()
        self._safe_db_op(
            self.save_message,
            message_id=asst_msg_id,
            target_id=info["target_id"],
            content="",
            role=ChatRole.ASSISTANT,
        )

        # 累积状态
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
            mode: str
            data: Any
            mode, data = chunk

            if mode == "messages":
                msg_chunk: Any
                meta: dict[str, Any]
                msg_chunk, meta = data
                node_name = meta.get("langgraph_node", "")
                if node_name in ("chat_node", "get_content_show"):
                    text = msg_chunk.content if hasattr(msg_chunk, 'content') else str(msg_chunk)
                    if text:
                        accumulated += text
                        tokens_since_flush += 1
                        pending = True

                        # 节流刷新：满足时间和数量条件才写库
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

                        yield {"type": SSEType.TOKEN, "content": text}

            elif mode == "values":
                state: dict[str, Any] = data

                # get_content_show 完成：result 非 None 时保存生成内容
                if (not display_saved
                        and state.get("result") is not None):
                    result_value = state["result"]
                    result_str = (
                        result_value if isinstance(result_value, str)
                        else json.dumps(result_value, ensure_ascii=False)
                    )
                    self._safe_db_op(
                        self.save_generated_display,
                        display_id=uuid.uuid4(),
                        target_id=info["target_id"],
                        result=result_str,
                    )
                    display_saved = True

                # chat_node 结束且条件不满足：发送 question
                if not question_sent and not state.get("conditions_satisfied", True):
                    question = state.get("question", "")
                    options = state.get("options", [])
                    if question:
                        # QUESTION：完整替换内容
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

                        yield {
                            "type": SSEType.QUESTION,
                            "content": {
                                "question": question,
                                "options": options,
                            },
                        }
                        question_sent = True

        # END / ERROR：最终 flush 未写入的累积内容
        if pending:
            self._safe_db_op(
                self.update_message,
                message_id=asst_msg_id,
                content=accumulated,
            )

        yield {"type": SSEType.END}
