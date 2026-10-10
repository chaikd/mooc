import unittest
import uuid
from datetime import datetime, timedelta
from types import SimpleNamespace

from agents_services.context.learning_context import (
    LearningContextBuilder,
    render_learning_context,
)
from services.schemas.public import DataStatus, MasteryState, TargetState


class FakeTargetRepository:
    def __init__(self, target):
        self.target = target

    def get_target_by_id(self, *, target_id, user_id=None):
        return self.target


class FakeNodeRepository:
    def __init__(self, nodes):
        self.nodes = nodes

    def get_nodes_by_target_id(self, *, target_id):
        return self.nodes


def make_node(*, title, mastery_state, sequence):
    return SimpleNamespace(
        id=uuid.uuid4(),
        title=title,
        mastery_state=mastery_state,
        status=DataStatus.ACTIVE,
        create_time=datetime(2026, 1, 1) + timedelta(days=sequence),
    )


class LearningContextBuilderTests(unittest.TestCase):
    def test_builds_current_recent_and_earlier_nodes(self):
        current = make_node(
            title="当前节点",
            mastery_state=MasteryState.INITIAL_MASTERY,
            sequence=4,
        )
        older = make_node(
            title="最早节点",
            mastery_state=MasteryState.STABLE_MASTERY,
            sequence=1,
        )
        recent_one = make_node(
            title="最近节点一",
            mastery_state=MasteryState.STABLE_MASTERY,
            sequence=2,
        )
        recent_two = make_node(
            title="最近节点二",
            mastery_state=MasteryState.CONTACTED,
            sequence=3,
        )
        target = SimpleNamespace(
            id=uuid.uuid4(),
            title="Python 异步编程",
            target_state=TargetState.LEARNING,
            mastery_state=MasteryState.INITIAL_MASTERY,
            current_node_id=current.id,
        )
        builder = LearningContextBuilder(
            target_repo=FakeTargetRepository(target),
            node_repo=FakeNodeRepository([current, older, recent_one, recent_two]),
            max_tokens=1000,
            chars_per_token=1.5,
        )

        context = builder.build(target_id=target.id, user_id="u1")
        rendered = render_learning_context(context)

        self.assertEqual(context.total_node_count, 4)
        self.assertEqual(context.current_node.title, "当前节点")
        self.assertEqual(
            [node.title for node in context.recent_nodes],
            ["最近节点一", "最近节点二"],
        )
        self.assertIn("最早节点", context.earlier_nodes_summary)
        self.assertIn("当前节点", rendered)
        self.assertNotIn(str(current.id), rendered)
        self.assertNotIn("<html", rendered)

    def test_no_nodes_returns_valid_empty_projection(self):
        target = SimpleNamespace(
            id=uuid.uuid4(),
            title="空目标",
            target_state=TargetState.Node_DISCOVERY,
            mastery_state=MasteryState.NOT_CONTACTED,
            current_node_id=None,
        )
        builder = LearningContextBuilder(
            target_repo=FakeTargetRepository(target),
            node_repo=FakeNodeRepository([]),
            max_tokens=1000,
            chars_per_token=1.5,
        )

        context = builder.build(target_id=target.id)
        rendered = render_learning_context(context)

        self.assertIsNone(context.current_node)
        self.assertEqual(context.total_node_count, 0)
        self.assertIn("当前节点：无", rendered)

    def test_projection_degrades_to_summary_without_losing_current_node(self):
        nodes = [
            make_node(
                title=f"历史节点{i}-" + "很长标题" * 8,
                mastery_state=MasteryState.INITIAL_MASTERY,
                sequence=i,
            )
            for i in range(20)
        ]
        current = nodes[-1]
        target = SimpleNamespace(
            id=uuid.uuid4(),
            title="大型学习目标",
            target_state=TargetState.LEARNING,
            mastery_state=MasteryState.INITIAL_MASTERY,
            current_node_id=current.id,
        )
        builder = LearningContextBuilder(
            target_repo=FakeTargetRepository(target),
            node_repo=FakeNodeRepository(nodes),
            max_tokens=120,
            chars_per_token=1.0,
        )

        context = builder.build(target_id=target.id)
        rendered = render_learning_context(context)

        self.assertIn(current.title, rendered)
        self.assertIn("节点总数：20", rendered)
        self.assertIn("更早节点统计", context.earlier_nodes_summary)


if __name__ == "__main__":
    unittest.main()
