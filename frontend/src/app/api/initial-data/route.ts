import { NextResponse } from 'next/server';

function getBackendBaseUrl() {
  // Server-side env var (not exposed to the browser)
  const raw = process.env.OPTIMIZER_API_BASE_URL || 'http://localhost:8000';
  return raw.replace(/\/+$/, '');
}

export async function GET(req: Request) {
  const backendBaseUrl = getBackendBaseUrl();
  const url = new URL(req.url);

  const candidateBaseUrls = Array.from(
    new Set([
      backendBaseUrl,
      // Common local fallback
      backendBaseUrl.includes('localhost') ? backendBaseUrl.replace('localhost', '127.0.0.1') : 'http://localhost:8000',
      'http://localhost:8001',
      'http://127.0.0.1:8001',
    ])
  );

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
