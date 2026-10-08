from contextlib import asynccontextmanager
from fastapi import FastAPI

from router.main import mastery_chat_router, targets_router
from router.common.exception_handler import register_exception_handlers
from agents_services.agents.chat import chat_agent
from database.postgres.postgres_pool import postgres_db
from database.postgres.checkpoint import async_chat_checkpoint as chat_checkpoint
from database.postgres.orm import orm

@asynccontextmanager
async def lifespan(app: FastAPI):
    database_pool = postgres_db.get_pool()
    await chat_checkpoint.initialize()
    chat_agent.get_agent()          # checkpointer 就绪后再编译图（内部缓存）
    orm.create_tables()
    yield
    await chat_checkpoint.close()
    orm.close()
    postgres_db.close()

app = FastAPI(
    lifespan=lifespan
)

register_exception_handlers(app)

app.include_router(mastery_chat_router)
app.include_router(targets_router)
