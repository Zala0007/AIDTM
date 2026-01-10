import { NextResponse } from 'next/server';

function getBackendBaseUrl() {
  // Use NEXT_PUBLIC_API_URL for production or fall back to local dev
  const raw = process.env.NEXT_PUBLIC_API_URL || process.env.OPTIMIZER_API_BASE_URL || 'http://localhost:8003';
  return raw.replace(/\/+$/, '');
}

export async function GET(req: Request) {
  const backendBaseUrl = getBackendBaseUrl();
  const url = new URL(req.url);

  // In production, use only the configured backend URL
  // In development, try common local ports
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const candidateBaseUrls = isDevelopment ? Array.from(
    new Set([
      backendBaseUrl,
      'http://localhost:8003',
      'http://127.0.0.1:8003',
      'http://localhost:8000',
      'http://127.0.0.1:8001',
    ])
  ) : [backendBaseUrl];

  try {
    let lastError: unknown;

    for (const base of candidateBaseUrls) {
      const upstreamUrl = `${base}/initial-data${url.search}`;
      try {
        const upstreamRes = await fetch(upstreamUrl, {
          method: 'GET',
          // Don’t cache across requests in dev; data can change.
          cache: 'no-store',
        });

        const contentType = upstreamRes.headers.get('content-type') || '';

        // Pass through JSON bodies as-is.
        if (contentType.includes('application/json')) {
          const json = await upstreamRes.json();
          return NextResponse.json(json, { status: upstreamRes.status });
        }

        // Fall back to text.
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
