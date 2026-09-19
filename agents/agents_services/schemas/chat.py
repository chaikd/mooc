from typing import Any, List, Optional, TypedDict

from langgraph.graph import MessagesState
from pydantic import BaseModel, Field


class StateSchema(MessagesState):
    conditions_satisfied: bool
    question: str
    options: list[str]
    learning_node: str
    mastery_state: str
    result: Optional[str | list[str | dict[Any, Any]]]

class ContentShow(TypedDict):
    result: Optional[str | list[str | dict[Any, Any]]]
    learning_node: str
    mastery_state: str

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