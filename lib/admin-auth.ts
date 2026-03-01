import { NextRequest } from "next/server";

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
