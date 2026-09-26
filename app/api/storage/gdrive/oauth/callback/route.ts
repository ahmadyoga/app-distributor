import { NextResponse } from "next/server";
import { requirePublisher } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { encryptSecret } from "@/lib/crypto";
import { exchangeCodeForTokens, getAccountEmail } from "@/lib/storage/gdrive";

export async function GET(req: Request) {
  await requirePublisher();

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = req.headers
    .get("cookie")
    ?.match(/gdrive_oauth_state=([^;]+)/)?.[1];

  if (!code || !state || !cookieState || state !== cookieState) {
    return NextResponse.redirect(
      new URL("/storage?error=oauth_state", req.url)
    );
  }

  const tokens = await exchangeCodeForTokens(code);
  if (!tokens.refresh_token) {
    return NextResponse.redirect(
      new URL("/storage?error=no_refresh_token", req.url)
    );
  }

  const email = await getAccountEmail(tokens.refresh_token).catch(
    () => "Google Drive"
  );

  const existingCount = await prisma.storageConnection.count();

  await prisma.storageConnection.create({
    data: {
      name: `Google Drive (${email})`,
      provider: "GOOGLE_DRIVE",
      accountLabel: email,
      isDefault: existingCount === 0,
      encryptedCredentials: encryptSecret(
        JSON.stringify({ refreshToken: tokens.refresh_token })
      ),
    },
  });

  const res = NextResponse.redirect(new URL("/storage", req.url));
  res.cookies.delete("gdrive_oauth_state");
  return res;
}
