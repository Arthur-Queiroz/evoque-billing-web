import { NextRequest, NextResponse } from "next/server";

const productionOrigin = "https://evoque.devarthur.com.br";

export function middleware(request: NextRequest) {
  const cloudflareVisitor = request.headers.get("cf-visitor");
  if (!cloudflareVisitor || !isHttpVisitor(cloudflareVisitor)) {
    return NextResponse.next();
  }

  const secureUrl = new URL(`${request.nextUrl.pathname}${request.nextUrl.search}`, productionOrigin);
  return NextResponse.redirect(secureUrl, 308);
}

function isHttpVisitor(cloudflareVisitor: string) {
  try {
    const visitor = JSON.parse(cloudflareVisitor) as { scheme?: unknown };
    return visitor.scheme === "http";
  } catch {
    return false;
  }
}
