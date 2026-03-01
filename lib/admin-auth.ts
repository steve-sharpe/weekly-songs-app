import { NextRequest, NextResponse } from "next/server";

export function isAdminAuthorized(request: NextRequest): boolean {
  const configuredSecret = process.env.ADMIN_SECRET?.trim();
  if (!configuredSecret) {
    return false;
  }

  const headerSecret = request.headers.get("x-admin-secret")?.trim();
  const bearer = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "")
    .trim();

  return headerSecret === configuredSecret || bearer === configuredSecret;
}

export function requireAdminAuth(request: NextRequest): NextResponse | null {
  const configuredSecret = process.env.ADMIN_SECRET?.trim();
  if (!configuredSecret) {
    return NextResponse.json(
      { error: "Server misconfigured: ADMIN_SECRET is not set." },
      { status: 500 },
    );
  }

  if (isAdminAuthorized(request)) {
    return null;
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
