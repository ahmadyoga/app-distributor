import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { decrypt, getSessionCookie } from "./session";
import { prisma } from "./db";

export const verifySession = cache(async () => {
  const cookie = await getSessionCookie();
  const session = await decrypt(cookie);
  if (!session?.userId) {
    redirect("/login");
  }
  return session;
});

/** Like verifySession but returns null instead of redirecting — for optional UI (e.g. topbar). */
export const getOptionalSession = cache(async () => {
  const cookie = await getSessionCookie();
  return decrypt(cookie);
});

export const getCurrentUser = cache(async () => {
  const session = await verifySession();
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, role: true, githubLogin: true, githubTokenSetAt: true },
  });
  // Valid cookie, but the user is gone: clear it rather than loop via /login.
  if (!user) redirect("/api/auth/expired");
  return user;
});

export async function requirePublisher() {
  const user = await getCurrentUser();
  if (user.role !== "PUBLISHER") {
    throw new Error("Forbidden: this action requires the Publisher role");
  }
  return user;
}
