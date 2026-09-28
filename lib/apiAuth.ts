import "server-only";
import { decrypt, getSessionCookie } from "./session";

/**
 * Verifies either a mobile Bearer token or the web's cookie session, so a
 * single route can serve both the Android app and the browser.
 */
export async function verifyBearerOrSession(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    return decrypt(auth.slice("Bearer ".length));
  }
  return decrypt(await getSessionCookie());
}
