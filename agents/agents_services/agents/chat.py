import json
from typing import Any, Literal, cast
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
                    SystemMessage(content="以下是要学习的内容描述："),
                    HumanMessage(state.get('messages')[-1].content)
                ],
            )
            result = res.content
            return {
                "result": result,
                "learning_node": state.get('learning_node') or '',
                "mastery_state": state.get('mastery_state') or ''
            }
        except Exception as e:
            logger.error("get_content_show: 调用大模型失败: %s", e, exc_info=True)
            raise RuntimeError(f"get_content_show 执行失败: {e}") from e
    def build_graph(self):
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

chat_agent = ChatAgent().get_agent()

if __name__ == "__main__":
    try:
        database_pool = postgres_db.get_pool()
        chat_checkpoint.initialize(database=database_pool)
        graph = ChatAgent().get_agent()
        config: RunnableConfig = {
            "configurable": {
                "thread_id": "test_thread_25",
            },
        }
        res = graph.stream_events(input=cast(Any, {"messages": [HumanMessage(content="学习python开发ai agent")]}), config=config, version="v3")
        # res = graph.stream_events(Command(resume="没有系统方法，只能反复试错"), config=config, version="v3")
        for event in res:
            print("🚀 ~ event:", event)
            if event.get('type') == "event" and event.get("method") == "values":
                print(event.get('params').get('data').get('messages')[-1])
    except Exception as e:
        logger.error("main: 图执行主流程失败: %s", e, exc_info=True)
        raise
