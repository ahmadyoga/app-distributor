import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifySession } from "@/lib/dal";
import { decryptSecret } from "@/lib/crypto";
import { presignS3Get } from "@/lib/storage/s3";
import { fetchDriveFileStream } from "@/lib/storage/gdrive";
import type { S3Credentials } from "@/lib/storage/s3";

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/builds/[id]/download">
) {
  await verifySession();

  const { id } = await ctx.params;
  const build = await prisma.build.findUnique({
    where: { id },
    include: { storageConnection: true },
  });

  if (!build || !build.storageConnection || !build.storageObjectKey) {
    return NextResponse.json({ error: "Build file not found" }, { status: 404 });
  }

  const connection = build.storageConnection;

  if (connection.provider === "S3_COMPATIBLE") {
    const creds = JSON.parse(
      decryptSecret(connection.encryptedCredentials)
    ) as S3Credentials;
    const url = await presignS3Get(creds, build.storageObjectKey);
    return NextResponse.redirect(url);
  }

  const { refreshToken } = JSON.parse(
    decryptSecret(connection.encryptedCredentials)
  ) as { refreshToken: string };

  const upstream = await fetchDriveFileStream(refreshToken, build.storageObjectKey);
  return new Response(upstream.body, {
    headers: {
      "Content-Type":
        upstream.headers.get("content-type") ??
        "application/vnd.android.package-archive",
      "Content-Disposition": `attachment; filename="${build.apkFileName ?? "build.apk"}"`,
    },
  });
}
