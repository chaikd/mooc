from contextlib import contextmanager
from typing import Generator

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from database.postgres.postgres_pool import postgres_db

load_dotenv()


class ORM:
    """SQLAlchemy ORM 实例，复用 psycopg 连接池管理 engine 与 session 的初始化及基本操作。"""

    def __init__(self) -> None:
        self.engine: Engine | None = None
        self._session_factory: sessionmaker | None = None

    def initialize(self) -> None:
        """复用 postgres_db 的 psycopg 连接池创建 engine 与 session 工厂。"""
        pool = postgres_db.get_pool()
        self.engine = create_engine(
            "postgresql+psycopg://",
            creator=pool.getconn,
        )
        self._session_factory = sessionmaker(bind=self.engine, autoflush=False)

    def create_tables(self) -> None:
        """根据已注册的 ORM 模型自动建表（幂等，已存在的表跳过）。"""
        # 确保所有模型在 create_all 之前被导入，否则 metadata 中缺少对应表
        import database.schemas.messages  # noqa: F401
        import database.schemas.targets  # noqa: F401
        import database.schemas.target_nodes  # noqa: F401
        import database.schemas.target_generated_displays  # noqa: F401

        from database.schemas.base import Base
        if self.engine is None:
            self.initialize()
        assert self.engine is not None
        Base.metadata.create_all(bind=self.engine)

    def get_session(self) -> Session:
        """获取一个新的 Session，未初始化时自动初始化。"""
        if self._session_factory is None:
            self.initialize()
        assert self._session_factory is not None
        return self._session_factory()

    @contextmanager
    def session(self) -> Generator[Session, None, None]:
        """以上下文管理器方式使用 Session，自动提交/回滚并关闭。"""
        session = self.get_session()
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    def close(self) -> None:
        """释放 engine 资源（不关闭底层 psycopg 池，池由 postgres_db 管理）。"""
        if self.engine is not None:
            self.engine.dispose()

orm = ORM()