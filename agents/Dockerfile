# ---------------------------------------------------------------------------
# builder：只负责用 uv 把依赖装进 /app/.venv
# ---------------------------------------------------------------------------
FROM ghcr.io/astral-sh/uv:python3.14-bookworm-slim AS builder

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=0

WORKDIR /app

# 先只放依赖清单，让依赖层能被缓存复用；改业务代码不会触发重装
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    uv sync --frozen --no-dev --no-install-project

# 再放源码。本项目是 uv virtual project，无需把自身装进 venv
COPY . .
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev --no-install-project

# ---------------------------------------------------------------------------
# runtime：只带 venv + 源码，以非 root 用户运行
# ---------------------------------------------------------------------------
FROM ghcr.io/astral-sh/uv:python3.14-bookworm-slim AS runtime

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/app/.venv/bin:$PATH"

# 项目无 __init__.py，靠隐式命名空间包 + 绝对导入，必须在项目根启动
WORKDIR /app

RUN groupadd --system app && useradd --system --gid app --create-home app

COPY --from=builder --chown=app:app /app/.venv /app/.venv
COPY --chown=app:app . .

# utils/logger_tool.py 会在代码同级创建 logs/，预先建好并交给运行用户
RUN mkdir -p /app/logs && chown -R app:app /app/logs

USER app

EXPOSE 8000

# lifespan 启动失败（如连不上 Postgres）时 uvicorn 不会监听端口，
# 因此「端口可连」等价于「DB 初始化已完成」。
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD python -c "import socket; socket.create_connection(('127.0.0.1', 8000), 2).close()"

# SSE 长连接要留足优雅停机时间（对齐 AGENT_TOTAL_TIMEOUT=360s）
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", \
     "--timeout-graceful-shutdown", "60"]
