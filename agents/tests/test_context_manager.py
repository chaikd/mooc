import unittest

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

from agents_services.context.manager import ContextManager


class FakeBoundModel:
    def __init__(self, owner, should_fail=False):
        self.owner = owner
        self.should_fail = should_fail

    async def ainvoke(self, messages):
        self.owner.summary_calls.append(messages)
        if self.should_fail:
            raise RuntimeError("summary failed")
        return AIMessage(content="压缩后的旧对话摘要")


class FakeLLM:
    def __init__(self, should_fail=False):
        self.should_fail = should_fail
        self.summary_calls = []
        self.bind_calls = []

    def bind(self, **kwargs):
        self.bind_calls.append(kwargs)
        return FakeBoundModel(
            self,
            should_fail=self.should_fail,
        )


def message_texts(messages):
    return [message.content for message in messages]


class ContextManagerTests(unittest.IsolatedAsyncioTestCase):
    async def test_under_threshold_does_not_call_summary_model(self):
        manager = ContextManager(
            FakeLLM(),
            summary_trigger_tokens=1000,
            recent_keep_tokens=600,
            chars_per_token=1.5,
        )
        state = {
            "messages": [
                HumanMessage(content="你好", id="m1"),
                AIMessage(content="你好，请说明学习目标", id="m2"),
                HumanMessage(content="我想学习 Python", id="m3"),
            ],
        }

        messages, update = await manager.prepare(
            state=state,
            leading_system_messages=[SystemMessage(content="system")],
            runtime_context=None,
        )

        self.assertEqual(update, {})
        self.assertEqual(message_texts(messages), ["system", "你好", "你好，请说明学习目标", "我想学习 Python"])

    async def test_reuses_summary_and_only_sends_messages_after_cursor(self):
        llm = FakeLLM()
        manager = ContextManager(
            llm,
            summary_trigger_tokens=1000,
            recent_keep_tokens=600,
            chars_per_token=1.5,
        )
        state = {
            "messages": [
                HumanMessage(content="旧问题", id="m1"),
                AIMessage(content="旧回答", id="m2"),
                HumanMessage(content="当前问题", id="m3"),
            ],
            "context_summary": "用户正在学习 Python。",
            "summary_through_message_id": "m2",
        }

        messages, update = await manager.prepare(
            state=state,
            leading_system_messages=[SystemMessage(content="system")],
            runtime_context=None,
        )

        self.assertEqual(update, {})
        self.assertEqual(len(llm.summary_calls), 0)
        self.assertIn("用户正在学习 Python。", messages[1].content)
        self.assertEqual(messages[-1].content, "当前问题")
        self.assertNotIn("旧问题", message_texts(messages))
        self.assertNotIn("旧回答", message_texts(messages))

    async def test_over_threshold_summarizes_prefix_and_advances_cursor(self):
        llm = FakeLLM()
        manager = ContextManager(
            llm,
            summary_trigger_tokens=1,
            recent_keep_tokens=5,
            summary_max_tokens=100,
            chars_per_token=1.0,
        )
        messages = [
            HumanMessage(content="旧问题一，内容足够长用于触发摘要", id="m1"),
            AIMessage(content="旧回答一，内容足够长用于触发摘要", id="m2"),
            HumanMessage(content="旧问题二，内容足够长用于触发摘要", id="m3"),
            AIMessage(content="旧回答二，内容足够长用于触发摘要", id="m4"),
            HumanMessage(content="当前问题", id="m5"),
        ]
        original_messages = list(messages)
        state = {"messages": messages}

        result, update = await manager.prepare(
            state=state,
            leading_system_messages=[SystemMessage(content="system")],
            runtime_context=None,
        )

        self.assertEqual(len(llm.summary_calls), 1)
        self.assertEqual(update["context_summary"], "压缩后的旧对话摘要")
        self.assertEqual(update["summary_through_message_id"], "m4")
        self.assertEqual(state["messages"], original_messages)
        self.assertEqual(result[-1].content, "当前问题")

    async def test_summary_failure_falls_back_without_moving_cursor(self):
        manager = ContextManager(
            FakeLLM(should_fail=True),
            summary_trigger_tokens=1,
            recent_keep_tokens=5,
            chars_per_token=1.0,
        )
        state = {
            "messages": [
                HumanMessage(content="旧问题一，内容足够长用于触发摘要", id="m1"),
                AIMessage(content="旧回答一，内容足够长用于触发摘要", id="m2"),
                HumanMessage(content="旧问题二，内容足够长用于触发摘要", id="m3"),
                AIMessage(content="旧回答二，内容足够长用于触发摘要", id="m4"),
                HumanMessage(content="当前问题", id="m5"),
            ],
            "context_summary": "旧摘要",
            "summary_through_message_id": "m2",
        }

        result, update = await manager.prepare(
            state=state,
            leading_system_messages=[SystemMessage(content="system")],
            runtime_context=None,
        )

        self.assertEqual(update, {})
        self.assertEqual(result[-1].content, "当前问题")
        self.assertTrue(
            any("旧摘要" in message.content for message in result),
        )

    async def test_missing_cursor_clears_stale_summary(self):
        manager = ContextManager(
            FakeLLM(),
            summary_trigger_tokens=1000,
            recent_keep_tokens=600,
            chars_per_token=1.5,
        )
        state = {
            "messages": [
                HumanMessage(content="当前问题", id="m1"),
            ],
            "context_summary": "过期摘要",
            "summary_through_message_id": "missing",
        }

        messages, update = await manager.prepare(
            state=state,
            leading_system_messages=[SystemMessage(content="system")],
            runtime_context=None,
        )

        self.assertEqual(update["context_summary"], "")
        self.assertIsNone(update["summary_through_message_id"])
        self.assertNotIn("过期摘要", message_texts(messages))
        self.assertEqual(messages[-1].content, "当前问题")


if __name__ == "__main__":
    unittest.main()
