import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const localApiBaseUrl = (process.env.EVOQUE_API_PROXY_URL ?? "http://127.0.0.1:5207").replace(/\/$/, "");

async function forwardRequest(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const { path } = await context.params;
  const targetUrl = new URL(`${localApiBaseUrl}/api/${path.join("/")}`);
  targetUrl.search = request.nextUrl.search;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete("connection");
  requestHeaders.delete("content-length");
  requestHeaders.delete("host");

  const methodHasBody = request.method !== "GET" && request.method !== "HEAD";
  const requestBody = methodHasBody ? await request.arrayBuffer() : undefined;

  try {
    const apiResponse = await fetch(targetUrl, {
      method: request.method,
      headers: requestHeaders,
      body: requestBody,
      cache: "no-store",
    });
    const responseHeaders = new Headers(apiResponse.headers);
    responseHeaders.delete("content-encoding");
    responseHeaders.delete("content-length");

    return new Response(apiResponse.body, {
      status: apiResponse.status,
      statusText: apiResponse.statusText,
      headers: responseHeaders,
    });
  } catch {
    return Response.json(
      { message: "Não foi possível conectar o portal à API de faturamento local." },
      { status: 502 },
    );
  }
}

export const GET = forwardRequest;
export const POST = forwardRequest;
export const PUT = forwardRequest;
export const PATCH = forwardRequest;
export const DELETE = forwardRequest;
