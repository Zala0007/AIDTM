import { NextResponse } from 'next/server';

function getBackendBaseUrl() {
  const raw = process.env.NEXT_PUBLIC_API_URL || process.env.OPTIMIZER_API_BASE_URL || 'http://localhost:8003';
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

  try {
    const body = await req.text();

    let lastError: unknown;

    for (const base of candidateBaseUrls) {
      const upstreamUrl = `${base}/optimize`;
      try {
        const upstreamRes = await fetch(upstreamUrl, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body,
        });

        const contentType = upstreamRes.headers.get('content-type') || '';

        if (contentType.includes('application/json')) {
          const json = await upstreamRes.json();
          return NextResponse.json(json, { status: upstreamRes.status });
        }

        const text = await upstreamRes.text();
        return new NextResponse(text, {
          status: upstreamRes.status,
          headers: { 'content-type': contentType || 'text/plain' },
        });
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        error: 'Upstream optimizer backend unreachable',
        attemptedBaseUrls: candidateBaseUrls,
        hint: 'Start the FastAPI server (uvicorn) and ensure the port matches OPTIMIZER_API_BASE_URL.',
        message,
      },
      { status: 502 }
    );
  }
}
