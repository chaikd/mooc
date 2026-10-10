from typing import Any, List, Literal, NotRequired, Optional, TypedDict

from langgraph.graph import MessagesState
from pydantic import BaseModel, Field


class StateSchema(MessagesState):
    input_type: Optional[str]
    learning_action: Optional[str]
    conditions_satisfied: bool
    question: str
    options: list[str]
    content_info: Optional[str]
    learning_node: str
    mastery_state: str
    result: Optional[str | list[str | dict[Any, Any]]]
    learning_decision: Optional[Literal["continue_current_node", "next_node"]]
    estimate_info: Optional[dict[str, str]]
    chat_directive: Optional[str]
    context_summary: NotRequired[str]
    summary_through_message_id: NotRequired[Optional[str]]
    context_summary_updated_at: NotRequired[Optional[str]]

class ContentShow(TypedDict):
    result: Optional[str | list[str | dict[Any, Any]]]
    learning_node: str
    mastery_state: str

class EstimateInfo(BaseModel):
    summary: str = Field(description="对当前节点学习状态的简要评估")
    next_learning_node: str = Field(default="", description="建议学习的下一个节点")
    reason: str = Field(default="", description="建议下一个节点的原因")

class LearningEstimateResponse(BaseModel):
    learning_decision: Literal["continue_current_node", "next_node"] = Field(
        description="继续学习当前节点，或者进入下一个节点"
    )
    estimate_info: EstimateInfo

class ChatResponse(BaseModel):
    conditions_satisfied: Optional[bool] = Field(description="信息是否满足确认要学习的内容")
    question: Optional[str] = Field(default="", description="要问用户的问题")
    options: Optional[List[str]] = Field(default_factory=list,description="可选答案")
    content_info: Optional[str] = Field(default=None, description="信息足够时返回要学习的内容相关描述信息")
    learning_node: Optional[str] = Field(default="", description="具体知识点或模块名称")
    mastery_state: Optional[str] = Field(default="", description="初步掌握")

class InterruptResponse(BaseModel):
    question: Optional[str] = Field(default="", description="要问用户的问题")
    options: Optional[List[str]] = Field(default_factory=list,description="可选答案")
