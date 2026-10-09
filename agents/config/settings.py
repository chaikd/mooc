from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "mooc"
    version: str = "0.0.1"
    # LLM
    LLM_API_KEY: str = "cc_switch"
    LLM_BASE_URL: str = "http://localhost:15721"
    LLM_MODEL_NAME: str = "deepseek-v4-flash"
    LLM_CONNECT_TIMEOUT: float = 10.0
    LLM_READ_TIMEOUT: float = 300.0
    LLM_WRITE_TIMEOUT: float = 30.0
    LLM_POOL_TIMEOUT: float = 10.0
    LLM_MAX_RETRIES: int = 2
    LLM_STREAM_CHUNK_TIMEOUT: float = 60.0
    # LLM_MODEL_NAME=qwen3.8-max

    # Agent timeout / retry
    AGENT_TOTAL_TIMEOUT: float = 360.0
    AGENT_CHAT_NODE_RUN_TIMEOUT: float = 90.0
    AGENT_CHAT_NODE_IDLE_TIMEOUT: float = 30.0
    AGENT_ESTIMATE_NODE_RUN_TIMEOUT: float = 90.0
    AGENT_ESTIMATE_NODE_IDLE_TIMEOUT: float = 30.0
    AGENT_GENERATE_NODE_RUN_TIMEOUT: float = 300.0
    AGENT_GENERATE_NODE_IDLE_TIMEOUT: float = 90.0
    AGENT_RETRY_INITIAL_INTERVAL: float = 0.5
    AGENT_RETRY_BACKOFF_FACTOR: float = 2.0
    AGENT_RETRY_MAX_INTERVAL: float = 8.0
    AGENT_RETRY_MAX_ATTEMPTS: int = 2
    AGENT_RETRY_JITTER: bool = True

    # postgressql
    POSTGRES_URL: str = "postgresql://postgres:123456@localhost:5432/mooc"
    # internal service auth
    INTERNAL_API_SECRET: str = "dev-internal-secret"

settings = Settings()

if __name__ == '__main__':
    print(settings.app_name)
