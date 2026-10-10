import asyncio
import json
import sys
from pathlib import Path
from typing import Any, Literal, cast

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from langgraph.graph import END, START, StateGraph
from langgraph.config import get_stream_writer
from langgraph.errors import NodeError, NodeTimeoutError
from langgraph.runtime import Runtime, get_runtime
from langgraph.types import RetryPolicy, TimeoutPolicy
from langchain_core.messages import AIMessage, SystemMessage, HumanMessage
from langchain_core.exceptions import (
    ModelAPIError,
    ModelConnectionError,
    ModelRateLimitError,
    ModelTimeoutError,
)
from langchain_openai import StreamChunkTimeoutError
from agents_services.agents.base import BaseAgent
from agents_services.context.manager import ContextManager
from agents_services.context.schemas import AgentRuntimeContext
from agents_services.schemas.chat import (
    ChatResponse,
    ContentShow,
    LearningEstimateResponse,
    StateSchema,
)
from prompts.loader import load_prompt
from utils.logger_tool import logger
from llm.model import get_chat_model
from config.settings import settings
from database.postgres.postgres_pool import postgres_db
from database.postgres.checkpoint import async_chat_checkpoint as chat_checkpoint


def _extract_chunk_text(content: Any) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: list[str] = []
        for item in content:
            if isinstance(item, str):
                parts.append(item)
            elif isinstance(item, dict) and isinstance(item.get("text"), str):
                parts.append(item["text"])
        return "".join(parts)
    return ""


def _retry_on_transient_model_error(exc: Exception) -> bool:
    should_retry = isinstance(
        exc,
        (
            ModelTimeoutError,
            ModelConnectionError,
            ModelRateLimitError,
            ModelAPIError,
            NodeTimeoutError,
            StreamChunkTimeoutError,
            TimeoutError,
        ),
    )
    if should_retry:
        logger.error(
            "agent.node.retry_triggered error_type=%s error=%s",
            type(exc).__name__,
            str(exc),
            exc_info=(type(exc), exc, exc.__traceback__),
        )
    return should_retry


class ChatAgent(BaseAgent):
    def __init__(self):
        self.agent = None
        self.llm = get_chat_model()
        self.context_manager = ContextManager(self.llm)

    def start_router_node(self, state: StateSchema) -> Literal["chat_node", "estimate_learning_state_node"]:
        if state.get("input_type") == "learning_action" and state.get("learning_action"):
            return "estimate_learning_state_node"
        return "chat_node"

    async def chat_node(
        self,
        state: StateSchema,
        runtime: Runtime[AgentRuntimeContext],
    ) -> dict[str, Any]:
        system_prompt = load_prompt("prompts/chat/content_info.md")
        leading_system_messages = [SystemMessage(content=system_prompt)]
        if state.get("chat_directive") == "regenerate_current":
            leading_system_messages.append(
                SystemMessage(
                    content=(
                        "系统判定用户需要继续学习当前节点。请结合评估信息和已有对话，"
                        "直接输出 conditions_satisfied=true 的最终结构化结果，"
                        "并给出完整 content_info，不要再向用户提问。"
                    )
                )
            )
        input_messages, context_update = await self.context_manager.prepare(
            state=state,
            leading_system_messages=leading_system_messages,
            runtime_context=runtime.context,
        )
        res = await self.llm.with_structured_output(
            ChatResponse,
            method="json_mode",
        ).ainvoke(input=input_messages)
        if not isinstance(res, ChatResponse):
            raise RuntimeError(f"chat_node: 大模型输出不是 ChatResponse, 实际类型={type(res).__name__}")

        update = {
            "messages": [AIMessage(content=res.model_dump_json())],
            "conditions_satisfied": res.conditions_satisfied or False,
            "question": res.question or '',
            "options": res.options or [],
            "content_info": res.content_info or None,
            "result": None,
            "learning_node": res.learning_node or '',
            "mastery_state": res.mastery_state or '',
            "chat_directive": None,
        }
        update.update(context_update)
        return update

    def chat_router_node(self,state: StateSchema) -> Literal["generate_node", "interrupt_node"]:
        if state.get("conditions_satisfied") and state.get("content_info"):
            return "generate_node"
        else:
            return "interrupt_node"

    def interrupt_node(self, state: StateSchema) -> dict[str, Any]:
        question = state.get("question") or "请继续说明你的学习目标。"
        options = state.get("options") or []
        return {
            "question": question,
            "options": options,
        }

    async def generate_node(self, state: StateSchema) -> ContentShow:
        system_prompt = load_prompt("prompts/chat/content_show_v3.md")
        content_info = state.get("content_info")
        if not content_info:
            raise RuntimeError("generate_node: 缺少 content_info")
        stream = self.llm.astream(
            input=[
                SystemMessage(content=system_prompt),
                SystemMessage(content="当前是测试，生成内容要简短，不要浪费token，这很重要。"),
                SystemMessage(content="以下是要学习的内容描述："),
                HumanMessage(content_info),
            ],
        )
        html_parts: list[str] = []
        writer = get_stream_writer()
        try:
            async for chunk in stream:
                text = _extract_chunk_text(chunk.content)
                if text:
                    html_parts.append(text)
                    get_runtime().heartbeat()
                    writer({"type": "generated_delta", "data": text})
            result = "".join(html_parts)
            return {
                "result": result,
                "learning_node": state.get('learning_node') or '',
                "mastery_state": state.get('mastery_state') or ''
            }
        finally:
            close = getattr(stream, "aclose", None)
            if close is not None:
                try:
                    await close()
                except Exception:
                    logger.exception("generate_node: 关闭模型流失败")

    async def estimate_learning_state_node(
        self,
        state: StateSchema,
        runtime: Runtime[AgentRuntimeContext],
    ) -> dict[str, Any]:
        system_prompt = load_prompt("prompts/chat/estimate_learning_state.md")
        learning_action = state.get("learning_action") or ""
        input_messages, context_update = await self.context_manager.prepare(
            state=state,
            leading_system_messages=[
                SystemMessage(content=system_prompt),
                SystemMessage(content=f"本轮学习操作信息：\n{learning_action}"),
            ],
            runtime_context=runtime.context,
        )
        res = await self.llm.with_structured_output(
            LearningEstimateResponse,
            method="json_mode",
        ).ainvoke(
            input=input_messages,
        )

        if not isinstance(res, LearningEstimateResponse):
            raise RuntimeError(
                "estimate_learning_state_node: 大模型输出不是 LearningEstimateResponse"
            )

        decision = res.learning_decision
        estimate_info = res.estimate_info.model_dump()
        if decision == "next_node" and not estimate_info.get("next_learning_node", "").strip():
            decision = "continue_current_node"
            estimate_info["next_learning_node"] = ""
            estimate_info["reason"] = ""

        update = {
            "learning_decision": decision,
            "estimate_info": estimate_info,
        }
        update.update(context_update)
        return update

    def estimate_router_node(
        self,
        state: StateSchema,
    ) -> Literal["continue_node", "next_node"]:
        if state.get("learning_decision") == "next_node":
            return "next_node"
        return "continue_node"

    def continue_node(self, state: StateSchema) -> dict[str, Any]:
        estimate_info = state.get("estimate_info") or {}
        summary = estimate_info.get("summary") or "当前节点仍需继续巩固。"
        message = (
            f"评估结果：{summary}"
            "我将基于本次学习操作重新构建当前节点的学习内容。"
        )
        return {
            "messages": [AIMessage(content=message)],
            "chat_directive": "regenerate_current",
            "conditions_satisfied": False,
            "question": "",
            "options": [],
        }

    def next_node(self, state: StateSchema) -> dict[str, Any]:
        estimate_info = state.get("estimate_info") or {}
        next_learning_node = estimate_info.get("next_learning_node") or "下一个学习节点"
        reason = estimate_info.get("reason") or "当前节点已经完成。"
        question = (
            "本节点已完成。"
            f"接下来建议学习：{next_learning_node}。"
            f"原因：{reason}"
            "是否同意？"
        )
        options = ["继续下一节", "重新学习当前节点"]
        try:
            writer = get_stream_writer()
            writer({
                "type": "target_state_change",
                "target_state": "evaluate_feedback",
                "source": "next_node",
            })
        except Exception:
            logger.exception("next_node: 发送 target_state custom event 失败")

        return {
            "messages": [
                AIMessage(
                    content=json.dumps(
                        {
                            "question": question,
                            "options": options,
                            "next_learning_node": next_learning_node,
                            "reason": reason,
                            "source": "next_node",
                        },
                        ensure_ascii=False,
                    )
                )
            ],
            "question": question,
            "options": options,
        }

    def log_node_error(self, _state: StateSchema, error: NodeError) -> Any:
        exc = error.error
        logger.error(
            "agent.node.error node=%s error_type=%s error=%s",
            error.node,
            type(exc).__name__,
            str(exc),
            exc_info=(type(exc), exc, exc.__traceback__),
        )
        raise exc

    def build_graph(self):
        if chat_checkpoint.saver is None:
            raise RuntimeError("checkpointer 未初始化：请先调用 chat_checkpoint.initialize()")
        builder = StateGraph(
            state_schema=StateSchema,
            context_schema=AgentRuntimeContext,
        )
        structured_retry_policy = RetryPolicy(
            initial_interval=settings.AGENT_RETRY_INITIAL_INTERVAL,
            backoff_factor=settings.AGENT_RETRY_BACKOFF_FACTOR,
            max_interval=settings.AGENT_RETRY_MAX_INTERVAL,
            max_attempts=settings.AGENT_RETRY_MAX_ATTEMPTS,
            jitter=settings.AGENT_RETRY_JITTER,
            retry_on=_retry_on_transient_model_error,
        )
        builder.add_node(
            "chat_node",
            self.chat_node,
            retry_policy=structured_retry_policy,
            error_handler=cast(Any, self.log_node_error),
            timeout=TimeoutPolicy(
                run_timeout=settings.AGENT_CHAT_NODE_RUN_TIMEOUT,
                idle_timeout=settings.AGENT_CHAT_NODE_IDLE_TIMEOUT,
            ),
        )
        builder.add_node("interrupt_node", self.interrupt_node)
        builder.add_node(
            "generate_node",
            self.generate_node,
            error_handler=cast(Any, self.log_node_error),
            timeout=TimeoutPolicy(
                run_timeout=settings.AGENT_GENERATE_NODE_RUN_TIMEOUT,
                idle_timeout=settings.AGENT_GENERATE_NODE_IDLE_TIMEOUT,
            ),
        )
        builder.add_node(
            "estimate_learning_state_node",
            self.estimate_learning_state_node,
            retry_policy=structured_retry_policy,
            error_handler=cast(Any, self.log_node_error),
            timeout=TimeoutPolicy(
                run_timeout=settings.AGENT_ESTIMATE_NODE_RUN_TIMEOUT,
                idle_timeout=settings.AGENT_ESTIMATE_NODE_IDLE_TIMEOUT,
            ),
        )
        builder.add_node("continue_node", self.continue_node)
        builder.add_node("next_node", self.next_node)

        builder.add_conditional_edges(
            START,
            self.start_router_node,
            {
                "chat_node": "chat_node",
                "estimate_learning_state_node": "estimate_learning_state_node",
            },
        )
        builder.add_conditional_edges(
            "chat_node",
            self.chat_router_node,
            {
                "generate_node": "generate_node",
                "interrupt_node": "interrupt_node",
            },
        )
        builder.add_conditional_edges(
            "estimate_learning_state_node",
            self.estimate_router_node,
            {
                "continue_node": "continue_node",
                "next_node": "next_node",
            },
        )
        builder.add_edge("continue_node", "chat_node")
        builder.add_edge("next_node", "interrupt_node")
        builder.add_edge("interrupt_node", END)
        builder.add_edge("generate_node", END)
        checkpointer = chat_checkpoint.saver
        graph = builder.compile(checkpointer=checkpointer)
        self.agent = graph
        return self.agent

chat_agent = ChatAgent()

if __name__ == "__main__":
    # try:
    #     database_pool = postgres_db.get_pool()
    #     chat_checkpoint.initialize(database=database_pool)
    #     graph = ChatAgent().get_agent()
    #     config: RunnableConfig = {
    #         "configurable": {
    #             "thread_id": "test_thread_26",
    #         },
    #     }
    #     res = graph.stream_events(input=cast(Any, {"messages": [HumanMessage(content="学习python开发ai agent")]}), config=config, version="v3")
    #     # res = graph.stream_events(Command(resume="没有系统方法，只能反复试错"), config=config, version="v3")
    #     for event in res:
    #         print("🚀 ~ event:", event)
    #         if event.get('type') == "event" and event.get("method") == "values":
    #             print(event.get('params').get('data').get('messages')[-1])
    # except Exception as e:
    #     logger.error("main: 图执行主流程失败: %s", e, exc_info=True)
    #     raise

    async def main() -> None:
        await chat_checkpoint.initialize()
        config: Any = {"configurable": {"thread_id": "debug-001"}}

        graph = ChatAgent().get_agent()
        for prompt in ("你好", "再见"):
            async for mode, chunk in graph.astream(
                {"messages": [HumanMessage(content=prompt)]},
                config=config,
                stream_mode=["messages", "values"],
            ):
                if mode == "values":
                    values = cast(dict[str, Any], chunk)
                    print("values:", [m.content for m in values["messages"]])

    asyncio.run(main())
