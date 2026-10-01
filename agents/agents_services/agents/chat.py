import json
import sys
from pathlib import Path
from typing import Any, Literal, cast

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from langgraph.graph import END, START, StateGraph
from langchain_core.messages import AIMessage, SystemMessage, HumanMessage
from langchain_core.runnables import RunnableConfig
from agents_services.agents.base import BaseAgent
from agents_services.schemas.chat import ChatResponse, ContentShow, InterruptResponse, StateSchema
from prompts.loader import load_prompt
from utils.logger_tool import logger
from llm.model import get_chat_model
from database.postgres.postgres_pool import postgres_db
from database.postgres.checkpoint import chat_checkpoint

class ChatAgent(BaseAgent):
    def __init__(self):
        self.agent = None
        self.llm = get_chat_model()

    def chat_node(self,state: StateSchema) -> StateSchema:
        system_prompt = load_prompt("prompts/chat/content_info.md")
        try:
            res = self.llm.with_structured_output(ChatResponse, method="json_mode").invoke(
                input=[
                    SystemMessage(content=system_prompt),
                    *state['messages'],
                ]
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
            "result": None,
            "learning_node": res.learning_node or '',
            "mastery_state": res.mastery_state or ''
        }
    def interrup_node(self, state: StateSchema) -> InterruptResponse:
        try:
            content = state["messages"][-1].content
            if not isinstance(content, (str, bytes, bytearray)):
                raise TypeError(f"消息内容类型不支持 JSON 解析: {type(content).__name__}")
            message = json.loads(content)
            question = message["question"]
            options = message["options"]
        except (json.JSONDecodeError, KeyError, TypeError, AttributeError) as e:
            logger.error("interrup_node: 解析问题/选项失败: %s", e, exc_info=True)
            raise RuntimeError(f"interrup_node: 解析问题/选项失败: {e}") from e

        # user_input = interrupt({
        #     "question": question,
        #     "options": options
        # })
        # return {
        #     "messages": [HumanMessage(content=user_input)]
        # }
        return InterruptResponse(
            question=question,
            options=options,
        )
    def router_node(self,state: StateSchema) -> Literal["get_content_show", "interrup_node"]:
        if state.get("conditions_satisfied"):
            return "get_content_show"
        else:
            return "interrup_node"
    def get_content_show(self,state: StateSchema) -> ContentShow:
        system_prompt = load_prompt("prompts/chat/content_show.md")
        try:
            res = self.llm.invoke(
                input=[
                    SystemMessage(content=system_prompt),
                    SystemMessage(content="本次为测试生成，只生成很少的的一部分html内容用于测试接口联通就好，内容不重要，不用全部生成，这是非常重要的。"),
                    SystemMessage(content="以下是要学习的内容描述："),
                    HumanMessage(state.get('messages')[-1].content)
                ],
            )
            print("🚀 ~ ChatAgent ~ get_content_show ~ state.get('messages')[-1].content:", state.get('messages')[-1].content)
            # {"conditions_satisfied":true,"question":"","options":[],"content_info":"面向已能用 LangChain 搭建简单 Agent、并动手写过简单多 Agent 协作 Demo、Python 较熟练的学习者。内容目标：帮助其从零散 Demo 经验升级为系统认知，理解常见协作模式（主管-下属/编排者-工作者、层级式、对等协作）的适用场景与取舍，并掌握 Agent 之间消息传递与共享状态（State）的通信机制。内容结构建议：1) 为什么需要多 Agent 协作：单 Agent 的局限与协作收益；2) 常见协作模式对比：主管-下属、层级、对等/群体协作，各自控制流、优缺点与典型场景；3) 通信机制：消息传递 vs 共享状态，如何设计共享 State、如何路由与条件跳转；4) 以 LangGraph 落地：节点/边、StateGraph、条件边、子图等核心概念与最小可运行代码骨架；5) 对照用户已有 Demo 做重构分析，指出其协作模式与可改进点；6) 循序渐进的小练习（如把顺序流程改为主管-下属模式并传递状态）。风格：讲解结合图解（协作拓扑图、状态流转图），代码示例简洁可运行，长度适中，重点突出‘模式选择’与‘通信设计’两个易混淆处。","learning_node":"多 Agent 协作的协作模式与通信机制（基于 LangGraph 实现）","mastery_state":"初步掌握"}
            # return {
            #     "result": """
            #         <!doctype html>
            #         <html lang="zh-CN">
            #             <head><meta charset="UTF-8"><style>
            #             body{font-family:system-ui,sans-serif;padding:24px;color:#1f2937;line-height:1.6}
            #             h1{color:#2563eb;margin-top:0} .card{background:#eff6ff;border-radius:8px;padding:16px;margin:12px 0}
            #             code{background:#f3f4f6;padding:2px 6px;border-radius:4px}
            #             </style></head>
            #             <body>
            #             <h1>{{Python 异步编程入门}}</h1>
            #             <div class="card"><p>这是一个<strong>模拟的微学习页面</strong>，用于演示 ContentViewer 的 iframe sandbox 渲染。</p></div>
            #             <p>当前节点 ID：<code>{{mock-target-id}}</code></p>
            #             </body>
            #         </html>
            #     """,
            #     "learning_node": state.get('learning_node') or '',
            #     "mastery_state": state.get('mastery_state') or ''
            # }
            return {
                "result": res.content,
                "learning_node": state.get('learning_node') or '',
                "mastery_state": state.get('mastery_state') or ''
            }
        except Exception as e:
            logger.error("get_content_show: 调用大模型失败: %s", e, exc_info=True)
            raise RuntimeError(f"get_content_show 执行失败: {e}") from e
    def build_graph(self):
        if chat_checkpoint.saver is None:
            raise RuntimeError("checkpointer 未初始化：请先调用 chat_checkpoint.initialize()")
        builder = StateGraph(state_schema=StateSchema, output_schema=ContentShow)
        builder.add_node("chat_node", self.chat_node)
        builder.add_node("interrup_node", self.interrup_node)
        builder.add_node("get_content_show", self.get_content_show)
        builder.add_edge(START, "chat_node")
        builder.add_conditional_edges("chat_node", self.router_node)
        builder.add_edge("interrup_node", END)
        builder.add_edge("get_content_show", END)
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
