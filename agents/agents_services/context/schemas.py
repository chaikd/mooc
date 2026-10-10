from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class LearningNodeContext:
    id: str
    title: str
    mastery_state: str
    status: str
    is_current: bool


@dataclass(frozen=True, slots=True)
class LearningRuntimeContext:
    target_id: str
    target_title: str
    target_state: str
    target_mastery_state: str
    current_node: LearningNodeContext | None
    recent_nodes: tuple[LearningNodeContext, ...]
    earlier_nodes_summary: str
    total_node_count: int

    @classmethod
    def empty(cls, target_id: str = "") -> "LearningRuntimeContext":
        return cls(
            target_id=target_id,
            target_title="",
            target_state="",
            target_mastery_state="",
            current_node=None,
            recent_nodes=(),
            earlier_nodes_summary="",
            total_node_count=0,
        )


@dataclass(frozen=True, slots=True)
class AgentRuntimeContext:
    learning_context: LearningRuntimeContext | None = None
