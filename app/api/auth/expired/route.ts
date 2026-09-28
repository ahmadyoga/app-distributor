import { NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/session";

/**
 * Clears a session whose user no longer exists (deleted account, reset
 * database). Pages can't delete cookies while rendering, and redirecting
 * straight to /login would bounce back — the proxy sends anyone with a
 * cookie away from /login — so the cookie is dropped here first.
 */
export function GET(req: Request) {
  const res = NextResponse.redirect(new URL("/login", req.url));
  res.cookies.delete(COOKIE_NAME);
  return res;
}
