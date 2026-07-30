import { NextResponse, type NextRequest } from "next/server";
import {
  accessControlState,
  isAuthorizedBasicRequest
} from "@/server/access-control";

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/api/health") return NextResponse.next();

  const state = accessControlState();
  if (state === "open") return NextResponse.next();
  if (state === "misconfigured") {
    return new NextResponse(
      "Protección no configurada: define APP_ACCESS_USERNAME y APP_ACCESS_PASSWORD.",
      { status: 503 }
    );
  }
  if (isAuthorizedBasicRequest(request.headers.get("authorization"))) {
    return NextResponse.next();
  }
  return new NextResponse("Autenticación requerida.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Brandforge", charset="UTF-8"' }
  });
}

export const config = {
  matcher: ["/:path*"]
};
