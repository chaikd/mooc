from langgraph.checkpoint.postgres import PostgresSaver
class Checkpoint:
  saver = None
  def __init__(self):
    super().__init__()
  def initialize(self, database):
    saver = PostgresSaver(database)
    saver.setup()
    self.saver = saver

chat_checkpoint = Checkpoint()


import os

from dotenv import load_dotenv
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from psycopg_pool import AsyncConnectionPool

load_dotenv()


class AsyncCheckPoint:
    saver = None
    pool = None

    async def initialize(self) -> None:
        if self.saver is not None:
            return

        pool = AsyncConnectionPool(
            conninfo=os.getenv("POSTGRES_URL") or "",
            min_size=1,
            max_size=4,
            open=False,
        )
        await pool.open(wait=True)
        saver = AsyncPostgresSaver(pool)
        await saver.setup()
        self.pool = pool
        self.saver = saver

    async def close(self) -> None:
        if self.pool is not None:
            await self.pool.close()
            self.pool = None
            self.saver = None


async_chat_checkpoint = AsyncCheckPoint()
