import { NextRequest, NextResponse } from "next/server";

const productionOrigin = "https://evoque.devarthur.com.br";

export function middleware(request: NextRequest) {
  const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",", 1)[0].trim();
  if (forwardedProtocol !== "http") {
    return NextResponse.next();
  }

  const secureUrl = new URL(`${request.nextUrl.pathname}${request.nextUrl.search}`, productionOrigin);
  return NextResponse.redirect(secureUrl, 308);
}
