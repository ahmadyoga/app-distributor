import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { requirePublisher } from "@/lib/dal";
import { buildAuthUrl, isGoogleDriveConfigured } from "@/lib/storage/gdrive";

export async function GET() {
  await requirePublisher();

  if (!isGoogleDriveConfigured()) {
    return NextResponse.json(
      {
        error:
          "Google Drive is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REDIRECT_URI.",
      },
      { status: 501 }
    );
  }

  const state = randomBytes(16).toString("hex");
  const url = buildAuthUrl(state);

  const res = NextResponse.redirect(url);
  res.cookies.set("gdrive_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return res;
}
