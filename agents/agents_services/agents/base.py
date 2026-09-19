from abc import ABC
from langgraph.graph.state import CompiledStateGraph, Runnable

class BaseAgent(ABC):
    def __init__(self):
        self.llm = None
        self.agent: CompiledStateGraph |  Runnable | None = None
        pass
    def build_graph(self) -> CompiledStateGraph | Runnable:
        raise NotImplementedError
    def get_agent(self) -> CompiledStateGraph | Runnable:
        if self.agent is None:
            self.agent = self.build_graph()
        return self.agent