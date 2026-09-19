from pydantic import ConfigDict
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    app_name: str = "mooc"
    version: str = "0.0.1"
    # LLM
    LLM_API_KEY: str="cc_switch"
    LLM_BASE_URL: str="http://localhost:15721"
    LLM_MODEL_NAME: str="deepseek-v4-flash"
    # LLM_MODEL_NAME=qwen3.8-max

    # postgressql
    POSTGRES_URL: str="postgresql://postgres:123456@localhost:5432/mooc"

    class Config:
        env_file = '.env'
        env_file_enconfig = "utf-8"
    # model_config = ConfigDict(
    #     env_file = ".env",
    #     env_file_encoding = "utf-8"
    # )

settings = Settings()

if __name__ == '__main__':
    print(settings.app_name)