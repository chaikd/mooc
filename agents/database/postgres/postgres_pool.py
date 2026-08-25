from contextlib import contextmanager

from dotenv import load_dotenv
from psycopg_pool import ConnectionPool
import os

load_dotenv()

class PostgresDB:
    def __init__(self):
        self.pool = None

    def initialize(self):
        self.pool = ConnectionPool(
            min_size=1,
            max_size=20,
            conninfo=os.getenv("POSTGRES_URL"),
        )
        self.pool.open()
        self.set_up()
    def set_up(self):
        with self.db_conn() as conn:
            try:
                pass
                # conn.execute("""
                #     CREATE DATABASE IF NOT EXISTS mooc
                # """)
            except Exception as e:
                print(f"Error setting up the database: {e}")
    def get_pool(self):
        if not self.pool:
            self.initialize()
        return self.pool

    @contextmanager
    def db_conn(self):
        with self.pool.connection() as conn:
            try:
                yield conn
            finally:
                pass

    def close(self):
        if self.pool:
            self.pool.close()

postgres_db = PostgresDB()
