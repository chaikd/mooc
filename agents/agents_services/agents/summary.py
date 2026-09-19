from agents_services.agents.base import BaseAgent
from llm.model import get_chat_model
from langgraph.graph.state import Runnable
from langchain_core.prompts import ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate
from langchain_core.output_parsers import StrOutputParser

from prompts.loader import load_prompt

class SummaryAgent(BaseAgent):
    def __init__(self, prompt):
        self.llm = get_chat_model()
        self.chain = self.build_chain(prompt)

    def build_chain(self, prompt: str) -> Runnable:
        prompts = ChatPromptTemplate.from_messages([
            SystemMessagePromptTemplate.from_template(prompt),
            HumanMessagePromptTemplate.from_template("以下是用户输入内容：{user_input}")
        ])
        return prompts | self.llm | StrOutputParser()
    
    def build_graph(self):
        return self.chain

    def summary(self, user_input: str):
        return self.chain.invoke({
            "user_input": user_input
        })

title_summary_agent = SummaryAgent(load_prompt("prompts/chat/summary_target_title.md"))