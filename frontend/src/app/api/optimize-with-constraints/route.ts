import { NextResponse } from 'next/server';

function getBackendBaseUrl() {
  const raw = process.env.OPTIMIZER_API_BASE_URL || 'http://localhost:8000';
  return raw.replace(/\/+$/, '');
}

export async function POST(req: Request) {
  const backendBaseUrl = getBackendBaseUrl();
  const candidateBaseUrls = Array.from(
    new Set([
      backendBaseUrl,
      backendBaseUrl.includes('localhost') ? backendBaseUrl.replace('localhost', '127.0.0.1') : 'http://localhost:8000',
      'http://localhost:8001',
      'http://127.0.0.1:8001',
    ])
  );

  const contentType = req.headers.get('content-type') || '';
  const bodyBuffer = await req.arrayBuffer();
  const headers: Record<string, string> = contentType ? { 'content-type': contentType } : {};

  let lastError: unknown;

  for (const base of candidateBaseUrls) {
    const upstreamUrl = `${base}/optimize-with-constraints/upload`;
    try {
      const upstreamRes = await fetch(upstreamUrl, {
        method: 'POST',
        headers,
        body: bodyBuffer,
      });

      const upstreamContentType = upstreamRes.headers.get('content-type') || '';

      if (upstreamContentType.includes('application/json')) {
        const json = await upstreamRes.json();
        return NextResponse.json(json, { status: upstreamRes.status });
      }

      const text = await upstreamRes.text();
      return new NextResponse(text, {
        status: upstreamRes.status,
        headers: { 'content-type': upstreamContentType || 'text/plain' },
      });
    } catch (err) {
      lastError = err;
    }
  }

  const message = lastError instanceof Error ? lastError.message : String(lastError);
  return NextResponse.json(
    {
      error: 'Upstream optimizer backend unreachable',
      attemptedBaseUrls: candidateBaseUrls,
      hint: 'Start the FastAPI server (uvicorn) on a reachable port and ensure OPTIMIZER_API_BASE_URL matches.',
      message,
    },
    { status: 502 }
  );
}
