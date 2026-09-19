# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

`agents/` 是 MOOC 平台「AI 学习」模块的后端服务，独立于 pnpm 管理的 Node.js monorepo，是一个自包含的 Python 项目（uv 管理，Python 3.14）。

核心能力：通过多轮对话诊断用户的学习目标与掌握程度（mastery_state），最终生成一个可直接运行的「交互式微学习 HTML 页面」。对话状态与消息持久化到 PostgreSQL。

- **技术栈**: FastAPI（SSE 流式）、LangGraph + LangChain、PostgreSQL（psycopg 连接池 + SQLAlchemy ORM + langgraph-checkpoint-postgres）
- **必须在本目录下运行**：整个项目**没有任何 `__init__.py`**，依赖 Python 隐式命名空间包，import 均为从项目根出发的相对路径（如 `from database.postgres.orm import orm`）

## 常用命令

- 安装依赖：`uv sync`
- 启动开发服务：`uv run uvicorn main:app --reload`（默认 http://localhost:8000，交互式文档在 `/docs`）
- LLM / DB 配置：编辑 `.env`（见下）

`pyproject.toml` 没有 `[project.scripts]`，也没有任何测试 / lint 脚本。

## 环境变量（`.env`）

- `LLM_API_KEY` / `LLM_BASE_URL` / `LLM_MODEL_NAME` — LLM 配置，默认走本地代理 `http://localhost:15721`（文件注释里保留了 deepseek / qwen 备选）
- `POSTGRES_URL` — 默认 `postgresql://postgres:123456@localhost:5432/mooc`

配置同时存在于 `config/settings.py`（pydantic-settings `BaseSettings`）和各模块直接 `os.getenv()` + `load_dotenv()` 两处。**实际运行时取值都走 `os.getenv()`；`config.settings` 目前没有被任何模块 import，基本是死代码**。新增配置优先沿用 `os.getenv()` 模式。

## 架构：一次请求的完整链路

`POST /api/mastery_chat`（SSE）请求的生命周期，是读懂本服务的关键路径：

1. **`main.py`** — FastAPI app。lifespan 启动时依次：初始化 psycopg 连接池 → 初始化 LangGraph checkpoint saver（`PostgresSaver.setup()` 建 checkpoint 表）→ `orm.create_tables()` 建业务表。
2. **`router/mastery_chat.py`** — 路由，返回 `EventSourceResponse`，逐个 yield SSE 事件。
3. **`services/mastery_chat.py`** — `MasteryChatService.get_target()`：
   - 先 `ensure_target`（幂等建 target）、保存用户消息、建空 assistant 占位消息（流式内容稍后增量回填）
   - 以 `stream_mode=["messages", "values"]` 流式消费 `chat_agent`
   - `messages` 模式 → 累积 token → **按节流（20 token / 0.5s）增量写 assistant 消息** → yield `TOKEN`
   - `values` 模式 → 检测到 `result`（生成的展示内容）时落库 `target_generated_displays`；条件不满足时 yield `QUESTION`
   - 最后 flush 未写内容并 yield `END`
4. **`agents_services/agents/chat.py`** — `ChatAgent`：LangGraph 状态图（见下）。

### LangGraph 状态图（核心）

```
START → chat_node ──router_node──> get_content_show → END
                         │
                         └────────> interrup_node    → END
```

- **`chat_node`**：用 `llm.with_structured_output(ChatResponse, method="json_mode")` 解析用户输入，产出 `conditions_satisfied` / `question` / `options` / `learning_node` / `mastery_state` / `content_info`。系统提示词为 `prompts/chat/content_info.md`（多轮学习诊断流程）。
- **`router_node`**：`conditions_satisfied` 为真 → `get_content_show`，否则 → `interrup_node`。
- **`get_content_show`**：普通 `llm.invoke()`，依据 content_info 生成完整 HTML 微学习页面。提示词为 `prompts/chat/content_show.md`。
- **`interrup_node`**：当前仅返回 `InterruptResponse`（真实的 LangGraph `interrupt()` 已被注释掉）。「打断」是靠 router 发 QUESTION SSE 并结束本轮实现；用户下一轮回答以同 `thread_id` 再次请求延续对话。

### Checkpoint 与 thread_id

- checkpoint 的 `thread_id` = `target_id`（一个学习目标 = 一条对话线程），见 `services/mastery_chat.py` 中的 `config`。
- `langgraph-checkpoint-postgres` 负责跨进程持久化对话历史到 PostgreSQL。

## 数据层分三层

- **`database/postgres/`**
  - `postgres_pool.py`：psycopg `ConnectionPool`，单例 `postgres_db`
  - `orm.py`：SQLAlchemy engine + sessionmaker，**复用上面的 psycopg 池**（`create_engine(..., creator=pool.getconn)`）；`create_tables()` 幂等建表
  - `checkpoint.py`：LangGraph `PostgresSaver`，单例 `chat_checkpoint`
- **`database/schemas/`**：SQLAlchemy ORM 模型（继承 `Base`）——`targets`（学习目标）、`target_nodes`（学习节点）、`messages`、`target_generated_displays`（生成 HTML 的版本历史）。`targets ↔ target_nodes` 存在循环外键，用 `use_alter=True` 延迟建 FK，避免建表拓扑排序卡死。
- **`database/repository/`**：每张表一个数据访问类，统一通过 `orm.session()` 上下文管理事务提交/回滚。

## 其它结构

- **`agents_services/agents/`**：`base.py`（`BaseAgent` 抽象，延迟构建 graph）、`chat.py`（`ChatAgent`，主对话状态图）、`summary.py`（`SummaryAgent`，LCEL chain，异步生成学习目标标题）
- **`services/`**：业务服务层。注意 `services/schemas/` —— **目录名是 typo（缺 "h"）**，import 写作 `from services.schemas.public import ...`（别改成 `schemas`）
  - `public.py` 定义枚举：`DataStatus`、`MasteryState`（**值是中文**：未接触/已接触/理解程度未知/初步掌握/稳定掌握/迁移掌握）、`ChatRole`、`SSEType`（TOKEN/QUESTION/END/ERROR）
- **`prompts/`**：`.md` 提示词，经 `prompts/loader.py` + `utils/path_tool.py` 以绝对路径加载
- **`utils/`**：`logger_tool.py`（日志写 `logs/agent_YYYYMMDD.log`）、`path_tool.py`
- **`llm/model.py`**：LLM 工厂，`get_chat_model()` 单例返回 `ChatOpenAI`（temperature=0.3）

## 约定与注意事项

- 模块适度类型注解，中文 docstring / 注释。
- 无测试；无 CI；无数据库迁移（`create_tables()` 自动建表，改 schema 需自行处理存量表）。
- `.env` 含 LLM API key 且被 git 跟踪（与仓库根 CLAUDE.md 已知问题一致）。