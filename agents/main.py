from contextlib import asynccontextmanager
from fastapi import FastAPI

from router.main import mastery_chat_router
from database.postgres.postgres_pool import postgres_db
from database.postgres.checkpoint import chat_checkpoint
from database.postgres.orm import orm

@asynccontextmanager
async def lifespan(app: FastAPI):
    database_pool = postgres_db.get_pool()
    chat_checkpoint.initialize(database=database_pool)
    orm.create_tables()
    yield
    orm.close()
    postgres_db.close()

app = FastAPI(
    lifespan=lifespan
)

app.include_router(mastery_chat_router)

