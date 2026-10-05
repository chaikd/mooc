import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const AGENTS_API_URL = (process.env.AGENTS_API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');
const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET || 'dev-internal-secret';

const EXCLUDED_RESPONSE_HEADERS = new Set([
  'connection',
  'content-encoding',
  'content-length',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

async function proxyRequest(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const userId = request.headers.get('userId');
  if (!userId) {
    return NextResponse.json({ message: '暂无权限' }, { status: 401 });
  }

  const { path } = await context.params;
  const requestId = randomUUID();
  const incomingUrl = new URL(request.url);
  const upstreamUrl = new URL(`/api/${path.join('/')}`, AGENTS_API_URL);
  upstreamUrl.search = incomingUrl.search;

  const headers = new Headers();
  const contentType = request.headers.get('content-type');
  const accept = request.headers.get('accept');

  if (contentType) headers.set('content-type', contentType);
  if (accept) headers.set('accept', accept);
  headers.set('x-request-id', requestId);
  headers.set('x-user-id', userId);
  headers.set('x-internal-secret', INTERNAL_API_SECRET);

  try {
    const upstream = await fetch(upstreamUrl, {
      method: request.method,
      headers,
      body: ['GET', 'HEAD'].includes(request.method)
        ? undefined
        : await request.arrayBuffer(),
      signal: request.signal,
    });

    const responseHeaders = new Headers();
    upstream.headers.forEach((value, key) => {
      if (!EXCLUDED_RESPONSE_HEADERS.has(key.toLowerCase())) {
        responseHeaders.set(key, value);
      }
    });
    responseHeaders.set('x-request-id', requestId);
    responseHeaders.set('x-accel-buffering', 'no');

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('[ai-learn-proxy] request failed', {
      requestId,
      method: request.method,
      upstreamUrl: upstreamUrl.toString(),
      error,
    });
    return NextResponse.json(
      { message: 'AI 学习服务暂时不可用' },
      { status: 502 },
    );
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
