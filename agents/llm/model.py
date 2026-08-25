from abc import ABC, abstractmethod
import os
from typing import Optional
from langchain_openai import ChatOpenAI
from langchain_core.language_models import BaseChatModel

from dotenv import load_dotenv
load_dotenv()

class LLMFactory(ABC):
    def __init__(self):
        super().__init__()
    @abstractmethod
    def generate(self) -> Optional[BaseChatModel]:
        pass

class ChatFactory(LLMFactory):
    def __init__(self):
        super().__init__()
        self.client = ChatOpenAI(
            openai_api_key=os.getenv("LLM_API_KEY"),
            openai_api_base=os.getenv("LLM_BASE_URL"),
            model=os.getenv("LLM_MODEL_NAME"),
            temperature=0.3,
            # top_p=0.1,
            # thinking='enabled',
            # response_effort='high',
            # max_tokens=4096,
            # response_format='text', # [text, json_object]
            # stop=[], # string[]
            # stream=False,
            # stream_options={
            #     "include_usage": True,
            # },
            # tools=[
            #     {
            #         "type": 'function',
            #         "function": {
            #             "name": 'get_current_weather',
            #             "description": 'Get the current weather in a given location',
            #             "parameters": {
            #                 "type": 'object',
            #                 "properties": {
            #                     "location": {
            #                         "type": 'string',
            #                         "description": 'The city and state, e.g. San Francisco, CA'
            #                     },
            #                     "unit": {
            #                         "type": 'string',
            #                         "enum": ['celsius', 'fahrenheit']
            #                     }
            #                 },
            #                 "required": ['location']
            #             }
            #         }
            #     }
            # ],
            # tool_choice='auto',
            # logprobs=True,
            # top_logprobs=3,
            # user_id="",
        )

    def generate(self):
        return self.client

chat_model = None
def get_chat_model():
    global chat_model
    if chat_model is None:
        factory = ChatFactory()
        chat_model = factory.generate()
    return chat_model

if __name__ == "__main__":
    import math
    # chat_model = get_chat_model()
    # response = chat_model.invoke(
    #     input=[
    #             {"role": "system", "content": "You are a helpful assistant."},
    #             {"role": "user", "content": "Hello! How can you assist me today?"}
    #         ]
    # )
    # print(response)
    print(math.exp(-0.6))