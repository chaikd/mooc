from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from router.main import mastery_chat_router, targets_router
from router.common.exception_handler import register_exception_handlers
from agents_services.agents.chat import chat_agent
from database.postgres.postgres_pool import postgres_db
from database.postgres.checkpoint import chat_checkpoint
from database.postgres.orm import orm

@asynccontextmanager
async def lifespan(app: FastAPI):
    database_pool = postgres_db.get_pool()
    chat_checkpoint.initialize(database=database_pool)
    chat_agent.get_agent()          # checkpointer 就绪后再编译图（内部缓存）
    orm.create_tables()
    yield
    orm.close()
    postgres_db.close()

app = FastAPI(
    lifespan=lifespan
)

register_exception_handlers(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001", "http://127.0.0.1:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(mastery_chat_router)
app.include_router(targets_router)
