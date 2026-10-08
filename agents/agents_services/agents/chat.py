import json
import sys
from pathlib import Path
from typing import Any, Literal, cast

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from langgraph.graph import END, START, StateGraph
from langgraph.config import get_stream_writer
from langchain_core.messages import AIMessage, AnyMessage, SystemMessage, HumanMessage
from agents_services.agents.base import BaseAgent
from agents_services.schemas.chat import (
    ChatResponse,
    ContentShow,
    LearningEstimateResponse,
    StateSchema,
)
from prompts.loader import load_prompt
from utils.logger_tool import logger
from llm.model import get_chat_model
from database.postgres.postgres_pool import postgres_db
from database.postgres.checkpoint import chat_checkpoint

class ChatAgent(BaseAgent):
    def __init__(self):
        self.agent = None
        self.llm = get_chat_model()

    def start_router_node(self, state: StateSchema) -> Literal["chat_node", "estimate_learning_state_node"]:
        if state.get("input_type") == "learning_action" and state.get("learning_action"):
            return "estimate_learning_state_node"
        return "chat_node"

    def chat_node(self, state: StateSchema) -> dict[str, Any]:
        system_prompt = load_prompt("prompts/chat/content_info.md")
        input_messages: list[AnyMessage] = [SystemMessage(content=system_prompt)]
        if state.get("chat_directive") == "regenerate_current":
            input_messages.append(
                SystemMessage(
                    content=(
                        "系统判定用户需要继续学习当前节点。请结合评估信息和已有对话，"
                        "直接输出 conditions_satisfied=true 的最终结构化结果，"
                        "并给出完整 content_info，不要再向用户提问。"
                    )
                )
            )
        input_messages.extend(state.get('messages', []))
        try:
            res = self.llm.with_structured_output(ChatResponse, method="json_mode").invoke(
                input=input_messages
            )
        except Exception as e:
            logger.error("chat_node: 调用大模型失败: %s", e, exc_info=True)
            raise RuntimeError(f"chat_node 执行失败: {e}") from e
        if not isinstance(res, ChatResponse):
            logger.error("chat_node: 大模型输出格式异常, 类型=%s", type(res).__name__)
            raise RuntimeError(f"chat_node: 大模型输出不是 ChatResponse, 实际类型={type(res).__name__}")

        return {
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

    def generate_node(self,state: StateSchema) -> ContentShow:
        system_prompt = load_prompt("prompts/chat/content_show_v2.md")
        content_info = state.get("content_info")
        if not content_info:
            raise RuntimeError("generate_node: 缺少 content_info")
        try:
            res = self.llm.invoke(
                input=[
                    SystemMessage(content=system_prompt),
                    SystemMessage(content="以下是要学习的内容描述："),
                    HumanMessage(content_info)
                ],
            )
            return {
                "result": res.content,
                "learning_node": state.get('learning_node') or '',
                "mastery_state": state.get('mastery_state') or ''
            }
        except Exception as e:
            logger.error("generate_node: 调用大模型失败: %s", e, exc_info=True)
            raise RuntimeError(f"generate_node 执行失败: {e}") from e

    def estimate_learning_state_node(self, state: StateSchema) -> dict[str, Any]:
        system_prompt = load_prompt("prompts/chat/estimate_learning_state.md")
        learning_action = state.get("learning_action") or ""
        try:
            res = self.llm.with_structured_output(
                LearningEstimateResponse,
                method="json_mode",
            ).invoke(
                input=[
                    SystemMessage(content=system_prompt),
                    SystemMessage(content=f"本轮学习操作信息：\n{learning_action}"),
                    *state["messages"],
                ]
            )
        except Exception as e:
            logger.error("estimate_learning_state_node: 调用大模型失败: %s", e, exc_info=True)
            raise RuntimeError(f"estimate_learning_state_node 执行失败: {e}") from e

        if not isinstance(res, LearningEstimateResponse):
            raise RuntimeError(
                "estimate_learning_state_node: 大模型输出不是 LearningEstimateResponse"
            )

        decision = res.learning_decision
        estimate_info = res.estimate_info.model_dump()
        if decision == "next_node" and not estimate_info.get("next_learning_node", "").strip():
            logger.warning("estimate_learning_state_node: 缺少下一节点建议，回退到继续当前节点")
            decision = "continue_current_node"
            estimate_info["next_learning_node"] = ""
            estimate_info["reason"] = ""

        return {
            "learning_decision": decision,
            "estimate_info": estimate_info,
        }

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

    def build_graph(self):
        if chat_checkpoint.saver is None:
            raise RuntimeError("checkpointer 未初始化：请先调用 chat_checkpoint.initialize()")
        builder = StateGraph(state_schema=StateSchema)
        builder.add_node("chat_node", self.chat_node)
        builder.add_node("interrupt_node", self.interrupt_node)
        builder.add_node("generate_node", self.generate_node)
        builder.add_node("estimate_learning_state_node", self.estimate_learning_state_node)
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

    database_pool = postgres_db.get_pool()
    chat_checkpoint.initialize(database=database_pool)
    config: Any = {"configurable": {"thread_id": "debug-001"}}

    graph = ChatAgent().get_agent()
    # 第一次对话
    for mode, chunk in graph.stream(
        {"messages": [HumanMessage(content="你好")]},
        config=config,
        stream_mode=["messages", "values"],
    ):
        if mode == "values":
            values = cast(dict[str, Any], chunk)
            print("第1轮 values:", [m.content for m in values["messages"]])

    # 第二次对话（相同 thread_id）
    for mode, chunk in graph.stream(
        {"messages": [HumanMessage(content="再见")]},
        config=config,
        stream_mode=["messages", "values"],
    ):
        if mode == "values":
            values = cast(dict[str, Any], chunk)
            print("第2轮 values:", [m.content for m in values["messages"]])
