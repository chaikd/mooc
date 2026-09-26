/**
 * 通用 SSE（Server-Sent Events）请求方法。
 * 纯基础设施，不绑定任何业务协议。
 */

export interface SSERawEvent {
  /** SSE event 头（如 "token", "question", "meta"；未设置时为空字符串） */
  event: string;
  /** SSE data 字段的原始字符串（多行 data: 已拼接） */
  data: string;
}

export interface SSERequestOptions {
  url: string;
  body?: Record<string, unknown>;
  method?: string;
  headers?: Record<string, string>;
  /** 每解析到一个完整 SSE 事件调用 */
  // eslint-disable-next-line no-unused-vars
  onEvent: (raw: SSERawEvent) => void;
  // eslint-disable-next-line no-unused-vars
  onError?: (err: Error) => void;
  /** 外部传入 AbortSignal；若不传则内部创建 AbortController */
  signal?: AbortSignal;
}

/**
 * 发起 SSE 请求并逐事件回调。
 *
 * @returns AbortController — 外部未传 signal 时用于中断请求。
 *          若已传 signal，返回的 controller 仍可用于统一接口，但其 signal 与传入的是同一个。
 *
 * 中断机制：
 * - 传入 signal → abort 时 reader.cancel()，不触发 onError
 * - 未传 signal → 用返回值的 .abort() 中断
 * - HTTP / 网络错误 → onError（AbortError 静默忽略）
 * - 流正常结束 → 不调 onError
 */
export function sseRequest(options: SSERequestOptions): AbortController {
  const {
    url,
    body,
    method = 'POST',
    headers,
    onEvent,
    onError,
    signal: externalSignal,
  } = options;

  // 统一使用一个 AbortController：外部传入 signal 时包装一层
  const ac = new AbortController();
  if (externalSignal) {
    if (externalSignal.aborted) {
      ac.abort(externalSignal.reason);
    } else {
      externalSignal.addEventListener('abort', () => ac.abort(externalSignal.reason), { once: true });
    }
  }

  const internalSignal = ac.signal;

  (async () => {
    try {
      const fetchHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...headers,
      };

      const res = await fetch(url, {
        method,
        headers: fetchHeaders,
        body: body != null ? JSON.stringify(body) : undefined,
        signal: internalSignal,
      });

      if (!res.ok) {
        throw new Error(`SSE request failed: HTTP ${res.status} ${res.statusText}`);
      }

      if (!res.body) {
        throw new Error('SSE response has no body');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      // 监听 abort 以提前关闭 reader
      internalSignal.addEventListener('abort', () => {
        reader.cancel().catch(() => {});
      }, { once: true });

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE 帧以 \n\n 分隔
        const frames = buffer.split('\n\n');
        // 最后一段可能不完整，留到下次拼接
        buffer = frames.pop() ?? '';

        for (const frame of frames) {
          const parsed = parseSSEFrame(frame);
          if (parsed) {
            onEvent(parsed);
          }
        }
      }

      // 处理 buffer 中剩余内容（无尾部 \n\n 的最后一帧）
      if (buffer.trim()) {
        const parsed = parseSSEFrame(buffer);
        if (parsed) {
          onEvent(parsed);
        }
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        onError?.(e instanceof Error ? e : new Error(String(e)));
      }
    }
  })();

  return ac;
}

/**
 * 解析单个 SSE 帧文本为 event + data。
 * 遵循 SSE 规范：event: 设置事件类型，data: 可出现多次并拼接（\n 分隔）。
 */
function parseSSEFrame(frame: string): SSERawEvent | null {
  let event = '';
  const dataLines: string[] = [];

  for (const line of frame.split('\n')) {
    if (line.startsWith('event:')) {
      event = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5));
    }
    // 忽略 id:, retry:, 注释行(:)等
  }

  if (dataLines.length === 0 && !event) {
    return null;
  }

  return {
    event,
    data: dataLines.join('\n'),
  };
}
