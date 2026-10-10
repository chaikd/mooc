from __future__ import annotations

from collections import defaultdict
from datetime import datetime
from typing import Iterable

from langchain_core.messages import SystemMessage
from langchain_core.messages.utils import count_tokens_approximately

from agents_services.context.schemas import (
    LearningNodeContext,
    LearningRuntimeContext,
)
from config.settings import settings
from database.repository.target_nodes_repository import TargetNodesRepository
from database.repository.target_repository import TargetRepository
from services.schemas.public import DataStatus, MasteryState
from utils.logger_tool import logger


_MASTERY_ORDER = (
    MasteryState.TRANSFER_MASTERY,
    MasteryState.STABLE_MASTERY,
    MasteryState.INITIAL_MASTERY,
    MasteryState.CONTACTED,
    MasteryState.NOT_CONTACTED,
    MasteryState.UNKNOWN,
)


def _enum_value(value: object) -> str:
    if value is None:
        return ""
    enum_value = getattr(value, "value", value)
    return str(enum_value)


def _render_context(
    *,
    target_title: str,
    target_state: str,
    target_mastery_state: str,
    current_node: LearningNodeContext | None,
    recent_nodes: Iterable[LearningNodeContext],
    earlier_nodes_summary: str,
    total_node_count: int,
) -> str:
    lines = ["<learning_context>"]
    if target_title:
        lines.append(f"目标：{target_title}")
    if target_state:
        lines.append(f"目标状态：{target_state}")
    if target_mastery_state:
        lines.append(f"目标掌握状态：{target_mastery_state}")

    if current_node:
        lines.append(
            "当前节点："
            f"{current_node.title}"
            f"（{current_node.mastery_state}，{current_node.status}）"
        )
    else:
        lines.append("当前节点：无")

    lines.append(f"节点总数：{total_node_count}")

    recent_nodes = tuple(recent_nodes)
    if recent_nodes:
        lines.append("")
        lines.append("最近节点：")
        for node in recent_nodes:
            lines.append(f"- {node.title}（{node.mastery_state}）")

    if earlier_nodes_summary:
        lines.append("")
        lines.append(earlier_nodes_summary)

    lines.append("</learning_context>")
    return "\n".join(lines)


def render_learning_context(context: LearningRuntimeContext) -> str:
    return _render_context(
        target_title=context.target_title,
        target_state=context.target_state,
        target_mastery_state=context.target_mastery_state,
        current_node=context.current_node,
        recent_nodes=context.recent_nodes,
        earlier_nodes_summary=context.earlier_nodes_summary,
        total_node_count=context.total_node_count,
    )


class LearningContextBuilder:
    def __init__(
        self,
        *,
        target_repo: TargetRepository | None = None,
        node_repo: TargetNodesRepository | None = None,
        max_tokens: int | None = None,
        chars_per_token: float | None = None,
    ) -> None:
        self.target_repo = target_repo or TargetRepository()
        self.node_repo = node_repo or TargetNodesRepository()
        self.max_tokens = (
            max_tokens
            if max_tokens is not None
            else settings.AGENT_LEARNING_CONTEXT_MAX_TOKENS
        )
        self.chars_per_token = (
            chars_per_token
            if chars_per_token is not None
            else settings.AGENT_CONTEXT_CHARS_PER_TOKEN
        )

    def build(
        self,
        *,
        target_id,
        user_id: str | None = None,
    ) -> LearningRuntimeContext:
        target = self.target_repo.get_target_by_id(
            target_id=target_id,
            user_id=user_id,
        )
        if target is None:
            return LearningRuntimeContext.empty(str(target_id))

        nodes = [
            node
            for node in self.node_repo.get_nodes_by_target_id(target_id=target_id)
            if node.status == DataStatus.ACTIVE
        ]
        nodes.sort(
            key=lambda node: node.create_time or datetime.min,
        )

        current_node = next(
            (node for node in nodes if node.id == target.current_node_id),
            None,
        )
        current_index = nodes.index(current_node) if current_node is not None else None

        recent_candidates = (
            nodes[:current_index] if current_index is not None else list(nodes)
        )
        recent_source = recent_candidates[-2:]
        recent_ids = {node.id for node in recent_source}
        earlier_source = [
            node
            for node in nodes
            if node.id not in recent_ids
            and (current_node is None or node.id != current_node.id)
        ]

        current_context = (
            self._to_node_context(current_node, is_current=True)
            if current_node is not None
            else None
        )
        recent_context = tuple(
            self._to_node_context(node, is_current=False)
            for node in recent_source
        )

        base = _render_context(
            target_title=target.title,
            target_state=_enum_value(target.target_state),
            target_mastery_state=_enum_value(target.mastery_state),
            current_node=current_context,
            recent_nodes=recent_context,
            earlier_nodes_summary="",
            total_node_count=len(nodes),
        )
        remaining_tokens = self.max_tokens - self._count_text(base)
        earlier_nodes_summary = self._render_earlier_nodes(
            earlier_source,
            remaining_tokens=remaining_tokens,
        )

        if remaining_tokens < 0:
            logger.warning(
                "context.learning_context.over_budget target_id=%s "
                "base_tokens=%s max_tokens=%s",
                target_id,
                self._count_text(base),
                self.max_tokens,
            )

        return LearningRuntimeContext(
            target_id=str(target.id),
            target_title=target.title,
            target_state=_enum_value(target.target_state),
            target_mastery_state=_enum_value(target.mastery_state),
            current_node=current_context,
            recent_nodes=recent_context,
            earlier_nodes_summary=earlier_nodes_summary,
            total_node_count=len(nodes),
        )

    def _to_node_context(
        self,
        node,
        *,
        is_current: bool,
    ) -> LearningNodeContext:
        return LearningNodeContext(
            id=str(node.id),
            title=node.title,
            mastery_state=_enum_value(node.mastery_state),
            status=_enum_value(node.status),
            is_current=is_current,
        )

    def _count_text(self, text: str) -> int:
        if not text:
            return 0
        return count_tokens_approximately(
            [SystemMessage(content=text)],
            chars_per_token=self.chars_per_token,
            extra_tokens_per_message=0,
        )

    def _render_earlier_nodes(
        self,
        nodes: list,
        *,
        remaining_tokens: int,
    ) -> str:
        if not nodes:
            return ""
        if remaining_tokens <= 0:
            return self._grouped_count_summary(nodes)

        full_lines = ["更早节点："]
        full_lines.extend(
            f"- {node.title}（{_enum_value(node.mastery_state)}）"
            for node in nodes
        )
        full_text = "\n".join(full_lines)
        if self._count_text(full_text) <= remaining_tokens:
            return full_text

        grouped = self._group_titles(nodes)
        grouped_text = self._grouped_lines(grouped)
        if self._count_text(grouped_text) <= remaining_tokens:
            return grouped_text

        capped = {
            mastery: titles[-8:]
            for mastery, titles in grouped.items()
        }
        omitted_counts = {
            mastery: max(len(grouped[mastery]) - len(titles), 0)
            for mastery, titles in capped.items()
        }
        capped_text = self._grouped_lines(
            capped,
            omitted_counts=omitted_counts,
        )
        if self._count_text(capped_text) <= remaining_tokens:
            return capped_text

        return self._grouped_count_summary(nodes)

    def _group_titles(self, nodes: list) -> dict[str, list[str]]:
        grouped: dict[str, list[str]] = defaultdict(list)
        for node in nodes:
            grouped[_enum_value(node.mastery_state)].append(node.title)
        return dict(grouped)

    def _grouped_lines(
        self,
        grouped: dict[str, list[str]],
        *,
        omitted_counts: dict[str, int] | None = None,
    ) -> str:
        lines = ["更早节点："]
        for mastery in self._ordered_mastery_values(grouped):
            titles = grouped[mastery]
            text = "、".join(titles) if titles else "无"
            omitted = (omitted_counts or {}).get(mastery, 0)
            if omitted:
                text = f"{text}...等 {omitted} 个"
            lines.append(f"- {mastery}：{text}")
        return "\n".join(lines)

    def _grouped_count_summary(self, nodes: list) -> str:
        counts: dict[str, int] = defaultdict(int)
        for node in nodes:
            counts[_enum_value(node.mastery_state)] += 1
        details = "；".join(
            f"{mastery} {counts[mastery]} 个"
            for mastery in self._ordered_mastery_values(counts)
        )
        return f"更早节点统计：共 {len(nodes)} 个；{details}"

    @staticmethod
    def _ordered_mastery_values(values: dict) -> list[str]:
        preferred = [_enum_value(value) for value in _MASTERY_ORDER]
        remaining = [value for value in values if value not in preferred]
        return [value for value in preferred if value in values] + remaining
