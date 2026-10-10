# Agent 上下文优化计划

## 1. 背景与目标

当前 `agents/` 服务通过 LangGraph 管理多轮学习对话，并使用 PostgreSQL checkpoint 保存线程状态。随着同一学习目标下的对话轮数和学习节点数量增加，模型输入会持续扩大，主要产生以下问题：

- `chat_node` 和 `estimate_learning_state_node` 都会把完整的 `state["messages"]` 发送给模型。
- 对话历史、模型结构化 JSON、节点切换消息都进入同一个 `messages` 通道，缺少 token 预算。
- 学习目标、节点和掌握状态已经保存在业务表中，但模型调用没有稳定、结构化的状态快照。
- 当前没有 token、摘要触发、消息裁剪和摘要失败等上下文指标。

本计划的目标是：

1. 限制每次主模型调用的历史上下文，降低 token 成本、延迟和上下文干扰。
2. 保留完整原始 `messages`，保证 checkpoint 可回放，不永久删除历史。
3. 将“对话摘要”和“学习状态”分离，避免摘要成为学习进度的错误事实源。
4. 为后续节点检索、长期用户记忆和 checkpoint 清理预留扩展点。

首期范围包括：

- 对话历史的 token 裁剪。
- 基于游标的增量对话摘要。
- 基于业务表的学习状态运行时快照。
- 节点信息的确定性投影。
- 日志、测试和分批上线方案。

首期不包含：

- 永久压缩或删除 checkpoint 中的消息。
- LangGraph `Store` 长期记忆。
- 用户级跨目标偏好和跨目标知识画像。
- 节点内容 HTML 摘要。
- `targets`、`target_nodes` 的表结构迁移。

## 2. 当前实现诊断

### 2.1 图状态与 checkpoint

当前状态定义位于 `agents/agents_services/schemas/chat.py`：

```python
class StateSchema(MessagesState):
    input_type: Optional[str]
    learning_action: Optional[str]
    conditions_satisfied: bool
    # ...
```

`StateSchema` 继承 `MessagesState`，`messages` 使用 `add_messages` reducer。图在 `agents/agents_services/agents/chat.py` 中编译并注入 `AsyncPostgresSaver`：

```python
graph = builder.compile(checkpointer=chat_checkpoint.saver)
```

`agents/services/mastery_chat.py` 使用 `target_id` 作为 `thread_id`：

```python
config = {
    "configurable": {
        "thread_id": str(real_target_id),
    }
}
```

因此：

- 一个学习目标对应一个 LangGraph 线程。
- 同一线程再次执行时，LangGraph 会自动从 checkpoint 恢复状态。
- `StateSchema` 中新增的普通字段也会随 checkpoint 保存和恢复。
- 节点中的 `state` 已经包含历史状态，不需要在节点内额外调用 `graph.get_state()`。

### 2.2 当前模型输入

`chat_node` 当前执行：

```python
input_messages = [SystemMessage(content=system_prompt)]
input_messages.extend(state.get("messages", []))
```

`estimate_learning_state_node` 当前执行：

```python
input=[
    SystemMessage(content=system_prompt),
    SystemMessage(content=f"本轮学习操作信息：\n{learning_action}"),
    *state["messages"],
]
```

两条模型调用路径都会受到历史持续增长的影响。

`generate_node` 只使用 `content_info` 和生成提示词，不消费对话历史，因此不属于本次历史上下文优化的核心路径。

### 2.3 学习状态现状

业务学习状态已经持久化在：

- `targets`：目标标题、`target_state`、目标掌握状态、`current_node_id`。
- `target_nodes`：节点标题、节点掌握状态、节点状态、创建时间。
- `target_generated_displays`：节点下生成的 HTML 内容版本。

这说明目标与节点状态已经有明确事实源，不应只保存在摘要中。

### 2.4 当前依赖能力

项目实际使用：

- `langgraph 1.2.11`
- `langchain-core 1.6.0`
- `langgraph-checkpoint-postgres 3.1.2`

当前环境没有安装：

- `langmem`
- 完整 `langchain` Agent middleware 栈

因此，虽然 LangGraph 生态提供 `SummarizationMiddleware` 和 `langmem.short_term.SummarizationNode` 等能力，但本项目当前使用原生 `StateGraph`，首期更适合实现一个轻量的自定义 `ContextManager`，避免为单一能力引入新的框架依赖。

## 3. LangGraph 上下文方案对比

LangGraph 官方将上下文管理拆分为短期线程记忆、长期跨线程记忆和运行时上下文。适用于本项目的方案如下。

| 方案 | 机制 | 优点 | 局限 | 本项目结论 |
| --- | --- | --- | --- | --- |
| 消息裁剪 | `trim_messages` | 确定性、无额外模型调用、实现简单 | 会暂时丢失被裁剪信息 | 首期采用 |
| 永久删除消息 | `RemoveMessage` / `REMOVE_ALL_MESSAGES` | 可降低 checkpoint 消息体积 | 丢失原始历史，影响回放和排查 | 首期不使用 |
| 对话摘要 | 独立模型总结旧消息，保存摘要 | 保留长对话语义，降低主模型 token | 增加一次模型调用，存在摘要失真风险 | 首期采用，失败时退化 |
| LangGraph Store | 跨线程键值记忆 | 支持用户级偏好和跨目标记忆 | 线程内学习状态会形成业务表与 Store 双事实源 | 后续按场景引入 |
| Runtime Context | `context_schema` / `Runtime.context` | 每次请求注入只读业务快照，不污染 checkpoint | 不适合保存会随节点执行更新的状态 | 首期采用 |
| 私有状态/输入输出 Schema | 内部状态与节点输入隔离 | 可避免中间字段进入外部状态 | 当前节点数量少，收益有限 | 暂不使用 |

官方参考：

- [Context engineering in agents](https://docs.langchain.com/oss/python/langchain/context-engineering)
- [Short-term memory](https://docs.langchain.com/oss/python/langchain/short-term-memory)
- [Memory in LangGraph](https://docs.langchain.com/oss/python/langgraph/add-memory)
- [Persistence](https://docs.langchain.com/oss/python/langgraph/persistence)
- [Stores](https://docs.langchain.com/oss/python/langgraph/stores)
- [Graph API](https://docs.langchain.com/oss/python/langgraph/graph-api)

## 4. 推荐架构

### 4.1 四层上下文模型

1. 业务学习状态

   事实源为 `targets` 和 `target_nodes`。保存目标、当前节点、节点掌握状态和节点状态。

2. 运行时快照

   每次请求从业务表构建 `LearningRuntimeContext`，通过 `context_schema` 注入 LangGraph。快照只读，不写入 checkpoint。

3. 对话摘要

   保存线程内对话语义，字段位于 `StateSchema`，随 checkpoint 持久化。摘要不是学习进度的权威来源。

4. 长期记忆

   LangGraph `Store` 的候选用途是用户级内容偏好、跨目标常见误区、学习风格等。首期不启用。

### 4.2 主模型输入结构

主模型输入固定为四个部分组成：

```text
1. 当前任务系统提示词
2. 结构化学习状态快照
3. 对话摘要
4. 摘要游标后的近期消息，包括当前 HumanMessage
```

示意：

```python
input_messages = [
    SystemMessage(content=task_system_prompt),
    SystemMessage(content=render_learning_context(runtime.context)),
    *build_summary_messages(context_summary),
    *recent_messages,
]
```

摘要和运行时快照都必须明确标记为“应用维护的背景数据”，避免被模型当成新的用户指令。

## 5. 对话摘要设计

### 5.1 状态字段

在 `StateSchema` 中新增：

```python
class StateSchema(MessagesState):
    # 已有字段...
    context_summary: str
    summary_through_message_id: Optional[str]
    context_summary_updated_at: Optional[str]
```

字段语义：

| 字段 | 含义 |
| --- | --- |
| `context_summary` | 已经被压缩的旧对话摘要 |
| `summary_through_message_id` | 摘要覆盖到的最后一条原始消息 ID |
| `context_summary_updated_at` | 最近一次成功更新摘要的 UTC 时间 |

`messages` 保持完整，不使用 `RemoveMessage`。摘要与近期消息的组合只在调用模型前临时构造。

### 5.2 摘要内容

摘要只记录对话中适合长期携带的语义信息：

- 用户的学习目标和目的。
- 用户明确表达的时间、深度、形式和风格偏好。
- 用户已经提供的能力证据和实际表现。
- 用户当前困难、误解和需要继续确认的问题。
- 已经确认的决策及其原因。
- 尚待用户回答或反馈的事项。

摘要不记录：

- 全部节点列表。
- 节点精确掌握状态。
- 节点 HTML 内容。
- 数据库 UUID、时间戳或内部实现细节。
- 应当由业务表提供的权威学习进度。

摘要中的节点或掌握状态只能作为对话背景，不能覆盖运行时快照。

### 5.3 配置

建议配置如下：

```text
AGENT_CONTEXT_ENABLED=true
AGENT_CONTEXT_SUMMARY_TRIGGER_TOKENS=8000
AGENT_CONTEXT_RECENT_KEEP_TOKENS=6000
AGENT_CONTEXT_SUMMARY_MAX_TOKENS=1000
AGENT_LEARNING_CONTEXT_MAX_TOKENS=1000
AGENT_CONTEXT_CHARS_PER_TOKEN=1.5
```

`AGENT_CONTEXT_CHARS_PER_TOKEN=1.5` 是面向中英文混合内容的安全近似值。摘要和裁剪统一使用 `langchain_core.messages.utils.count_tokens_approximately`，不能只用默认的英文 4 字符/token。

### 5.4 摘要决策算法

定义：

```python
summary = state.get("context_summary")
cursor_id = state.get("summary_through_message_id")
unsummarized = messages_after(state["messages"], cursor_id)
```

主流程：

1. 如果 `unsummarized` 的估算 token 数不超过 `8000`，不调用摘要模型。
2. 如果已有旧摘要，向主模型发送“旧摘要 + 全部未摘要消息”。
3. 如果未超过阈值且没有旧摘要，直接发送全部未摘要消息。
4. 如果超过 `8000` token，从 `unsummarized` 尾部保留约 `6000` token 的近期消息。
5. 将更早且未被近期窗口保留的消息作为 `prefix_to_summarize`。
6. 调用摘要模型，输入为“旧摘要 + `prefix_to_summarize`”。
7. 摘要成功后，将 `summary_through_message_id` 更新为 `prefix_to_summarize` 最后一条消息的 ID。
8. 本轮主模型使用“新摘要 + 近期消息”。

伪代码：

```python
async def prepare_messages(state, task_system_prompt, runtime):
    summary = state.get("context_summary", "")
    cursor_id = state.get("summary_through_message_id")

    unsummarized = messages_after(state["messages"], cursor_id)
    unsummarized_tokens = count_tokens(unsummarized)

    summary_update = {}
    model_history = unsummarized

    if unsummarized_tokens > SUMMARY_TRIGGER_TOKENS:
        recent = trim_messages(
            unsummarized,
            max_tokens=RECENT_KEEP_TOKENS,
            strategy="last",
            token_counter=count_tokens,
            start_on="human",
            end_on="human",
            include_system=False,
            allow_partial=False,
        )

        prefix_to_summarize = messages_before(
            unsummarized,
            recent[0].id,
        )

        if prefix_to_summarize:
            try:
                new_summary = await summarize(
                    previous_summary=summary,
                    messages=prefix_to_summarize,
                )
                summary = new_summary
                summary_update = {
                    "context_summary": new_summary,
                    "summary_through_message_id": prefix_to_summarize[-1].id,
                    "context_summary_updated_at": utc_now_iso(),
                }
            except Exception:
                logger.exception("context.summary.failed")
                recent = trim_messages(
                    unsummarized,
                    max_tokens=RECENT_KEEP_TOKENS,
                    strategy="last",
                    token_counter=count_tokens,
                    start_on="human",
                    end_on="human",
                    include_system=False,
                    allow_partial=False,
                )
                model_history = recent
        else:
            model_history = recent
    else:
        model_history = unsummarized

    return build_main_model_input(
        task_system_prompt=task_system_prompt,
        learning_context=runtime.context.learning_context,
        summary=summary,
        history=model_history,
    ), summary_update
```

### 5.5 中间状态

系统允许长期处于以下状态：

```text
旧 context_summary
+ summary_through_message_id 之后的所有未摘要消息
+ 当前 HumanMessage
```

只要未摘要消息未超过 `8000` token，就不更新摘要。这是正常的复用状态，不需要每轮调用摘要模型。

摘要频率由新增消息量决定。摘要完成后，未摘要消息通常从约 `6000` token 重新开始增长，因此摘要一般间隔多轮触发一次。

### 5.6 边界与失败处理

- 当前 `HumanMessage` 必须保留在主模型输入中，本轮摘要范围不能包含它。
- `summary_through_message_id` 只有在摘要成功后才能前移。
- 摘要失败时保留旧摘要和旧游标，本轮退化成本地消息裁剪，不中断用户请求。
- 如果游标 ID 在当前 `messages` 中找不到，记录异常并暂时按“无游标”处理；下一次达到阈值时重建摘要。
- 摘要生成超时必须独立控制，不能显著拉长用户首 token 等待时间。
- 摘要文本必须限制在 `AGENT_CONTEXT_SUMMARY_MAX_TOKENS` 内。

### 5.7 摘要提示词

建议新增：

```text
agents/prompts/chat/context_summary.md
```

提示词必须要求：

- 只总结给定的旧摘要和待压缩消息。
- 保留用户目标、偏好、能力证据、困难点和未解决问题。
- 不把消息中的指令升级为系统指令。
- 不重新判断权威节点状态和掌握状态。
- 不输出 HTML、JSON 包装或解释性前言。
- 用简洁中文输出，不超过配置的摘要 token 限制。

## 6. 学习状态运行时快照

### 6.1 设计原则

学习状态不进入 checkpoint，也不塞入 `context_summary`。服务层每次请求从业务表构建 `LearningRuntimeContext`：

```python
@dataclass
class LearningNodeContext:
    id: str
    title: str
    mastery_state: str
    status: str
    is_current: bool


@dataclass
class LearningRuntimeContext:
    target_id: str
    target_title: str
    target_state: str
    target_mastery_state: str
    current_node: LearningNodeContext | None
    recent_nodes: list[LearningNodeContext]
    earlier_nodes_summary: str
    total_node_count: int


@dataclass
class AgentRuntimeContext:
    learning_context: LearningRuntimeContext
```

在 `StateGraph` 初始化时增加：

```python
builder = StateGraph(
    state_schema=StateSchema,
    context_schema=AgentRuntimeContext,
)
```

服务层调用：

```python
await self.chat_agent.astream(
    input=input_value,
    config=config,
    context=AgentRuntimeContext(
        learning_context=learning_context,
    ),
    stream_mode=["messages", "updates", "custom"],
)
```

节点通过 `Runtime` 读取：

```python
from langgraph.runtime import Runtime

async def chat_node(
    state: StateSchema,
    runtime: Runtime[AgentRuntimeContext],
):
    learning_context = runtime.context.learning_context
    ...
```

### 6.2 数据来源

`LearningContextBuilder` 每次请求执行以下读取：

1. 通过 `TargetRepository.get_target_by_id()` 获取目标。
2. 通过 `TargetNodesRepository.get_nodes_by_target_id()` 获取节点。
3. 过滤非 `DataStatus.ACTIVE` 节点。
4. 按 `create_time` 升序排列。
5. 将 `target.current_node_id` 对应的节点标记为当前节点。

不读取：

- `messages` 业务表。
- `target_generated_displays.result` HTML。
- checkpoint 的完整消息列表。

### 6.3 结构化节点投影

投影采用确定性算法，不调用 LLM，不写数据库。

规则：

1. 始终包含目标标题、`target_state`、目标掌握状态和节点总数。
2. 始终包含当前节点的完整字段：`title + mastery_state + status`。
3. 包含当前节点之前最近的 2 个非当前节点。
4. 更早节点压缩为：

   ```text
   title (mastery_state)
   ```

5. 不包含节点 UUID、HTML、创建时间或更新时间。
6. 投影渲染为带明确标签的文本块，推荐使用 JSON 或 XML 风格标签，避免和用户输入混淆。

示例：

```text
<learning_context>
目标：Python 异步编程
目标状态：learning
目标掌握状态：初步掌握
当前节点：asyncio Task 生命周期（初步掌握，active）
节点总数：8

最近节点：
- asyncio 事件循环（稳定掌握）
- async/await 基本语法（稳定掌握）

更早节点：
- 已稳定掌握：函数定义、装饰器基础
- 初步掌握：生成器、上下文管理器
- 已接触：异常处理
</learning_context>
```

### 6.4 节点预算降级

投影上限：

```text
AGENT_LEARNING_CONTEXT_MAX_TOKENS=1000
```

构建顺序：

1. 先生成目标、当前节点和最近 2 个节点的基础块。
2. 计算基础块 token。
3. 如果剩余预算足够，将更早节点按时间顺序逐行加入。
4. 如果仍然超预算，将更早节点按 `MasteryState` 分组，用逗号连接标题。
5. 如果分组后仍超预算，对每组最多保留最近 8 个标题，并追加 `...等 N 个`。
6. 如果仍超预算，仅保留各掌握状态的数量统计。

降级不能删除以下内容：

- 目标标题和状态。
- 当前节点完整信息。
- 最近 2 个节点的完整信息。
- 节点总数。

### 6.5 旧节点按需查询

首期不把所有旧节点内容常驻到提示词。如果用户明确表示：

- “重新学习某个旧节点”
- “之前那个关于 XX 的节点”
- “查看某个节点的内容”

后续可以通过节点标题匹配或由前端传入 `target_node_id`，从数据库单独读取对应节点。该能力属于后续增强，不改变当前投影算法。

## 7. 接口与代码改造清单

### 7.1 状态与 Schema

- 修改 `agents/agents_services/schemas/chat.py`。
- 增加摘要字段，不改变 `messages` reducer。
- 新增 `LearningRuntimeContext` 和 `LearningNodeContext`。
- 新增 `AgentRuntimeContext`。

### 7.2 上下文管理

- 新增 `ContextManager`，负责：
  - 读取摘要和游标。
  - 计算未摘要消息 token。
  - 决定是否更新摘要。
  - 组装摘要和近期消息。
  - 记录上下文日志。
- 新增 `LearningContextBuilder`，负责：
  - 从业务仓储读取目标和节点。
  - 生成 `LearningRuntimeContext`。
  - 按 token 预算渲染结构化学习状态。

推荐模块路径：

```text
agents/agents_services/context/
  __init__.py
  manager.py
  learning_context.py
  schemas.py
```

由于项目使用隐式命名空间包，新增 `__init__.py` 不是强制要求，但如果局部模块需要明确导出，可以使用显式初始化文件。

### 7.3 图集成

- `chat_node` 不再直接使用完整的 `state["messages"]`。
- `chat_node` 调用 `ContextManager` 生成主模型输入。
- `estimate_learning_state_node` 使用同一套消息选择逻辑。
- 两个节点在成功生成或复用摘要时，将摘要更新字段合并到节点返回值。
- `generate_node` 保持现状。
- `StateGraph` 增加 `context_schema=AgentRuntimeContext`。

### 7.4 服务层集成

- `MasteryChatService` 在调用图之前构建 `AgentRuntimeContext`。
- `_astream_graph()` 向 `astream()` 传递 `context`。
- 学习状态读取失败时应记录日志并回退为空快照；对话仍可使用摘要和近期消息继续执行。
- 不改变现有 SSE 事件格式和业务 `messages` 表写入逻辑。

### 7.5 配置

建议将配置加入 `agents/config/settings.py`，并保持与项目现有环境变量读取方式一致：

```text
AGENT_CONTEXT_ENABLED
AGENT_CONTEXT_SUMMARY_TRIGGER_TOKENS
AGENT_CONTEXT_RECENT_KEEP_TOKENS
AGENT_CONTEXT_SUMMARY_MAX_TOKENS
AGENT_LEARNING_CONTEXT_MAX_TOKENS
AGENT_CONTEXT_CHARS_PER_TOKEN
```

如果当前代码仍以 `os.getenv()` 为主要取值方式，应避免只读取 `settings` 而忽略实际运行路径。

## 8. 日志与可观测性

每次主模型调用记录结构化日志：

```json
{
  "event": "context.prepare",
  "target_id": "...",
  "raw_message_count": 32,
  "raw_context_tokens": 14200,
  "unsummarized_tokens": 9100,
  "sent_message_count": 8,
  "sent_context_tokens": 6200,
  "summary_reused": true,
  "summary_updated": true,
  "summary_fallback": false,
  "learning_context_tokens": 380
}
```

摘要触发、成功、失败和游标异常单独记录：

```text
context.summary.triggered
context.summary.completed
context.summary.failed
context.summary.cursor_missing
context.learning_context.build_failed
```

日志不得记录完整用户文本、摘要正文、节点 HTML 或敏感字段。

## 9. 实施阶段

### 阶段 1：基础改造与观测

- 增加摘要状态字段和上下文配置。
- 实现 `ContextManager` 的 token 统计、消息裁剪和日志。
- 暂不启用摘要，仅验证裁剪路径和现有行为兼容性。
- 通过开关 `AGENT_CONTEXT_ENABLED` 控制是否启用。

### 阶段 2：启用增量摘要

- 新增摘要提示词。
- 在 `chat_node` 和 `estimate_learning_state_node` 接入摘要更新。
- 验证游标恢复、失败回退和 checkpoint 向后兼容。
- 先对内部测试线程启用，观察摘要频率、延迟和主模型输入 token。

### 阶段 3：注入学习状态快照

- 实现 `LearningContextBuilder`。
- 给图增加 `context_schema`。
- 服务层每次请求注入 `AgentRuntimeContext`。
- 验证节点投影在多节点目标下不超预算。

### 阶段 4：灰度与评估

- 按内部用户或内部 target 灰度。
- 对比启用前后的平均输入 token、首 token 延迟、总耗时、错误率和摘要触发频率。
- 评估连续对话一致性、节点重复推荐、掌握状态漂移和用户重试行为。

### 阶段 5：后续增强

以下能力不进入首期：

- checkpoint 历史清理和保留策略。
- 旧节点按需检索。
- Store 用户级长期记忆。
- 节点内容短摘要字段。
- 多线程并发下的摘要冲突控制。

## 10. 测试计划

### 10.1 单元测试

摘要决策：

- 无摘要且 token 未超阈值时，不调用摘要模型。
- 已有摘要且 token 未超阈值时，复用旧摘要并发送全部未摘要消息。
- 超过阈值时，只摘要更早的前缀，不包含近期消息和当前 `HumanMessage`。
- 摘要成功后，`context_summary` 和游标同时更新。
- 摘要失败后，游标不变，本轮仍返回有效模型输入。
- 游标不存在时，按安全回退处理。

消息裁剪：

- 结果以 `HumanMessage` 开始并以当前 `HumanMessage` 结束。
- 不产生孤立的 `ToolMessage` 或非法消息顺序。
- 当前用户输入永远不会被裁剪。
- 原始 `state["messages"]` 不被修改。

节点投影：

- 无节点时不产生空字段错误。
- 一个节点时包含当前节点完整信息。
- 三个节点时包含全部节点。
- 大量节点时按 token 限制降级，并始终保留目标和当前节点。
- 投影中不包含 HTML、UUID 和时间字段。

摘要内容约束：

- 摘要提示词不接收完整 HTML。
- 摘要输出不更新权威节点掌握状态。
- 摘要模型只看到旧摘要和待压缩消息。

### 10.2 集成测试

使用假聊天模型和 `InMemorySaver` 验证：

- 第一轮无摘要。
- 中间轮次复用“旧摘要 + 部分消息”。
- 超阈值轮次触发一次摘要并前移游标。
- 后续轮次从 checkpoint 恢复摘要和游标。
- 原始 `messages` 不被删除，主模型输入 token 保持有界。
- `thread_id=target_id` 隔离不同学习目标的摘要。
- 学习状态来自运行时快照，不依赖摘要中的节点描述。

### 10.3 验收标准

- 短对话不产生额外摘要模型调用。
- 长对话的主模型历史输入稳定在配置预算内。
- 摘要失败不影响用户请求完成。
- checkpoint 可以恢复完整原始消息和摘要字段。
- 当前结构化输出、学习状态路由和 SSE 事件行为不回归。
- 多节点目标的状态快照不超过配置 token 上限。
- 业务表和 LangGraph checkpoint 不产生学习进度的双事实源。

## 11. 风险与缓解

| 风险 | 影响 | 缓解措施 |
| --- | --- | --- |
| 摘要丢失早期关键信息 | 模型重复提问或选择错误节点 | 保留原始消息、限制摘要触发频率、使用结构化摘要提示词 |
| 摘要失败增加延迟 | 用户等待变长 | 设置摘要超时，失败时立即裁剪并继续主流程 |
| 摘要与业务状态不一致 | 模型使用过期进度 | 节点状态只从业务表运行时快照读取 |
| checkpoint 继续增长 | 存储和状态读取成本增加 | 首期明确不解决，后续单独设计历史归档或压缩 |
| 中英文 token 估算偏差 | 实际输入仍可能超限 | 使用保守 `chars_per_token`，保留输出 token 余量 |
| 同一线程并发请求 | 摘要和游标可能竞争 | 首期保持现有线程调用约定，后续增加按 target 的并发控制 |
| 用户输入诱导摘要 | 摘要污染后续上下文 | 明确标注数据块和指令边界，摘要提示词拒绝指令升级 |

## 12. 决策摘要

- 对话摘要是 thread 级短期记忆，保存在 LangGraph checkpoint。
- `messages` 保持完整和 append-only，不做永久删除。
- 学习目标、节点和掌握状态以 `targets`、`target_nodes` 为事实源。
- 学习状态通过 `context_schema` 注入每次运行，不复制进 checkpoint。
- 节点投影采用确定性、token 有界的结构化算法。
- 首期不使用 LangGraph `Store`。
- 首期不新增数据库字段，不引入 `langmem` 或完整 `langchain` Agent middleware。

## 13. 参考资料

- [Context engineering in agents](https://docs.langchain.com/oss/python/langchain/context-engineering)
- [Short-term memory](https://docs.langchain.com/oss/python/langchain/short-term-memory)
- [Memory in LangGraph](https://docs.langchain.com/oss/python/langgraph/add-memory)
- [Persistence](https://docs.langchain.com/oss/python/langgraph/persistence)
- [Stores](https://docs.langchain.com/oss/python/langgraph/stores)
- [Graph API](https://docs.langchain.com/oss/python/langgraph/graph-api)
