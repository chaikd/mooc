from langgraph.checkpoint.postgres import PostgresSaver

from config.settings import settings


class Checkpoint:
  saver = None
  def __init__(self):
    super().__init__()
  def initialize(self, database):
    saver = PostgresSaver(database)
    saver.setup()
    self.saver = saver

chat_checkpoint = Checkpoint()


from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from psycopg_pool import AsyncConnectionPool


class AsyncCheckPoint:
    saver = None
    pool = None

    async def initialize(self) -> None:
        if self.saver is not None:
            return

        pool = AsyncConnectionPool(
            conninfo=settings.POSTGRES_URL,
            min_size=1,
            max_size=4,
            # setup() 的 migration 里有 CREATE INDEX CONCURRENTLY，该语句不能在事务块内执行，
            # 必须让连接处于 autocommit 模式（与 AsyncPostgresSaver.from_conn_string 一致）。
            kwargs={"autocommit": True},
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
