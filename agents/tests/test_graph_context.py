import unittest

from langchain_core.messages import AIMessage, HumanMessage
from langgraph.checkpoint.memory import InMemorySaver

from agents_services.agents.chat import ChatAgent, chat_checkpoint
from agents_services.context.manager import ContextManager
from agents_services.schemas.chat import ChatResponse


class StructuredRunnable:
    async def ainvoke(self, input):
        return ChatResponse(
            conditions_satisfied=False,
            question="继续说明",
            options=[],
        )


class BoundSummaryModel:
    def __init__(self, owner):
        self.owner = owner

    async def ainvoke(self, messages):
        self.owner.summary_calls += 1
        return AIMessage(content="摘要：用户正在学习 Python。")


class FakeLLM:
    def __init__(self):
        self.summary_calls = 0

    def with_structured_output(self, schema, method):
        return StructuredRunnable()

    def bind(self, **kwargs):
        return BoundSummaryModel(self)


class GraphContextTests(unittest.IsolatedAsyncioTestCase):
    async def test_graph_persists_summary_and_cursor_without_current_human(self):
        previous_saver = chat_checkpoint.saver
        chat_checkpoint.saver = InMemorySaver()
        try:
            llm = FakeLLM()
            chat_agent = ChatAgent()
            chat_agent.llm = llm
            chat_agent.context_manager = ContextManager(
                llm,
                enabled=True,
                summary_trigger_tokens=1,
                recent_keep_tokens=5,
                chars_per_token=1.0,
                summary_max_tokens=100,
            )
            graph = chat_agent.get_agent()
            config = {
                "configurable": {
                    "thread_id": "graph-context-test",
                }
            }
            messages = [
                HumanMessage(content="旧问题一，内容足够长用于触发摘要", id="m1"),
                AIMessage(content="旧回答一，内容足够长用于触发摘要", id="m2"),
                HumanMessage(content="旧问题二，内容足够长用于触发摘要", id="m3"),
                AIMessage(content="旧回答二，内容足够长用于触发摘要", id="m4"),
                HumanMessage(content="当前问题", id="m5"),
            ]

            async for _ in graph.astream(
                {"messages": messages},
                config=config,
                stream_mode=["updates"],
            ):
                pass

            state = await graph.aget_state(config)
            self.assertEqual(
                state.values.get("context_summary"),
                "摘要：用户正在学习 Python。",
            )
            self.assertEqual(
                state.values.get("summary_through_message_id"),
                "m4",
            )
            self.assertEqual(llm.summary_calls, 1)
            self.assertEqual(len(state.values["messages"]), 6)
        finally:
            chat_checkpoint.saver = previous_saver


if __name__ == "__main__":
    unittest.main()
