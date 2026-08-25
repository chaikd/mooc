import json
from typing import Literal
from langgraph.graph import END, START, MessagesState, StateGraph
from langchain_core.messages import SystemMessage, HumanMessage
from langgraph.types import interrupt
from utils.path_tool import get_abs_path
from llm.model import get_chat_model
from database.postgres.postgres_pool import postgres_db
from database.postgres.checkpoint import chat_checkpoint
from langgraph.checkpoint.memory import InMemorySaver

class StateSchema(MessagesState):
    content = {
        "type": Literal["md", "video", "image", "audio"],
        "content_info": str,
    }
    conditions_satisfied: bool
    question: str
    options: list[str]
    result: str
    query: str

class ChatAgent():
    def __init__(self):
        self.agent = self.generate_graph

    def generate_graph(self):
        def get_content_info(state: StateSchema) -> StateSchema:
            query = state.get("query")
            print("🚀 ~ ChatAgent ~ get_content_info ~ query:", query)
            question = state.get("question")
            with open(get_abs_path("prompts/content_info.md"), "r") as f:
                llm_model = get_chat_model()
                system_prompt = f.read()
                if query:
                    res = llm_model.invoke(
                        input=[
                            SystemMessage(content=system_prompt),
                            HumanMessage(content=query)
                        ],
                        # kwargs={
                        #     "structured_output": StateSchema
                        # }
                    )
                    return {
                        "messages": [res]
                    }
                elif question:
                    options = state.get("options")
                    if not options:
                        options = []
                    interrupt_json = json.dumps({
                        "question": question,
                        "options": options
                    })
                    user_input = interrupt(interrupt_json)
                    res = llm_model.invoke(
                        input=[
                            *state.get('messages'),
                            HumanMessage(content=user_input)
                        ],
                        # kwargs={
                        #     "structured_output": StateSchema
                        # }
                    )
                    return {
                        "messages": [res]
                    }
        def interrup_node(state: StateSchema) -> StateSchema:
            question = state.get("question")
            options = state.get("options")
            if not options:
                options = []
            interrupt_json = json.dumps({
                "question": question,
                "options": options
            })
            user_input = interrupt(interrupt_json)
            return {
                "messages": [HumanMessage(content=user_input)]
            }
        def router_node(state: StateSchema) -> Literal["get_content_info", "interrup_node"]:
            if state.get("conditions_satisfied"):
                return "get_content_show"
            else:
                return "interrup_node"
        def get_content_show(state: StateSchema) -> StateSchema:
            content_info = state.get("content_info")
            content_type = state.get("type")
            if content_type == "md":
                with open("./prompts/content_show.md", "r") as f:
                    llm_model = get_chat_model()
                    system_prompt = f.read()
                    res = llm_model.invoke(
                        input=[
                            SystemMessage(content=system_prompt),
                            *state.get('messages'),
                            HumanMessage(content=content_info)
                        ],
                        # structured_output=StateSchema
                    )
                    return {
                        "messages": [res]
                    }
        builder = StateGraph(state_schema=StateSchema)
        builder.add_node("get_content_info", get_content_info)
        builder.add_node("interrup_node", interrup_node)
        builder.add_node("get_content_show", get_content_show)
        builder.add_edge(START, "get_content_info")
        builder.add_conditional_edges("get_content_info", router_node)
        builder.add_edge("interrup_node", "get_content_info")
        builder.add_edge("get_content_show", END)
        checkpointer = chat_checkpoint.saver
        # checkpointer = InMemorySaver()
        graph = builder.compile(checkpointer=checkpointer)
        # display(graph)
        return graph

chat_agent = ChatAgent()

if __name__ == "__main__":
    database_pool = postgres_db.get_pool()
    chat_checkpoint.initialize(database=database_pool)
    graph = chat_agent.generate_graph()
    # res = graph.invoke(input={"query": "我想要学习Python，开发ai agent"}, config = {
    #     "thread_id": "test_thread_5",
    # })
    res = graph.invoke(input={"query": "做过较完整的项目，能独立调试代码"}, config = {
        "thread_id": "test_thread_5",
    })
    print("🚀 ~ res:", res)
