from contextlib import contextmanager

from dotenv import load_dotenv
from psycopg_pool import ConnectionPool
import os

load_dotenv()


class PostgresDB:
    def __init__(self):
        self.pool: ConnectionPool | None = None

    def initialize(self):
        self.pool = ConnectionPool(
            min_size=1,
            max_size=20,
            conninfo=os.getenv("POSTGRES_URL") or '',
        )
        self.pool.open()

    def get_pool(self) -> ConnectionPool:
        if not self.pool:
            self.initialize()
        assert self.pool is not None
        return self.pool

    @contextmanager
    def db_conn(self):
        if self.pool:
            with self.pool.connection() as conn:
                try:
                    yield conn
                finally:
                    pass

    def close(self):
        if self.pool:
            self.pool.close()

postgres_db = PostgresDB()
