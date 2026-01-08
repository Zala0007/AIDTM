import { NextResponse } from 'next/server';

function getBackendBaseUrl() {
  const raw = process.env.OPTIMIZER_API_BASE_URL || 'http://localhost:8000';
  return raw.replace(/\/+$/, '');
}

export async function GET(req: Request) {
  const backendBaseUrl = getBackendBaseUrl();
  const url = new URL(req.url);

  const candidateBaseUrls = Array.from(
    new Set([
      backendBaseUrl,
      backendBaseUrl.includes('localhost') ? backendBaseUrl.replace('localhost', '127.0.0.1') : 'http://localhost:8000',
    ])
  );

  try {
    let lastError: unknown;

    for (const base of candidateBaseUrls) {
      const upstreamUrl = `${base}/sustainability-data${url.search}`;
      try {
        const upstreamRes = await fetch(upstreamUrl, {
          method: 'GET',
          cache: 'no-store',
        });

        const contentType = upstreamRes.headers.get('content-type') || '';

        if (contentType.includes('application/json')) {
          const json = await upstreamRes.json();
          return NextResponse.json(json, { status: upstreamRes.status });
        }

        const text = await upstreamRes.text();
        return new NextResponse(text, { status: upstreamRes.status });
      } catch (err) {
        lastError = err;
        continue;
      }
    }

    const message = lastError instanceof Error ? lastError.message : String(lastError);
    return NextResponse.json(
      { error: `Backend connection failed: ${message}` },
      { status: 502 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Proxy error: ${message}` },
      { status: 500 }
    );
  }
}
