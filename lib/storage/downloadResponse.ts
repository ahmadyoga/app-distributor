import "server-only";
import { NextResponse } from "next/server";
import type { Build, StorageConnection } from "@prisma/client";
import { decryptSecret } from "@/lib/crypto";
import { presignS3Get, type S3Credentials } from "@/lib/storage/s3";
import { fetchDriveFileStream } from "@/lib/storage/gdrive";
import { attachmentDisposition } from "@/lib/format";

/** Cookie the DownloadButton polls for to learn the file has started arriving. */
export const DOWNLOAD_COOKIE_PREFIX = "dl_";
const DOWNLOAD_ID_RE = /^[a-z0-9]{8,32}$/i;

type DownloadableBuild = Pick<Build, "storageObjectKey" | "apkFileName"> & {
  storageConnection: StorageConnection | null;
};

/**
 * Responds with the build's APK — a redirect to a presigned URL for S3, a
 * proxied stream for Google Drive. When the request carries `?dl=<id>`, a
 * short-lived cookie marks the moment the response starts, since a page can't
 * otherwise observe when a browser download begins.
 */
export async function downloadResponse(req: Request, build: DownloadableBuild) {
  if (!build.storageConnection || !build.storageObjectKey) {
    return NextResponse.json({ error: "Build file not found" }, { status: 404 });
  }

  const connection = build.storageConnection;
  const secret = decryptSecret(connection.encryptedCredentials);
  let res: NextResponse;

  if (connection.provider === "S3_COMPATIBLE") {
    const url = await presignS3Get(JSON.parse(secret) as S3Credentials, build.storageObjectKey);
    res = NextResponse.redirect(url);
  } else {
    const { refreshToken } = JSON.parse(secret) as { refreshToken: string };
    const upstream = await fetchDriveFileStream(refreshToken, build.storageObjectKey);
    const headers = new Headers({
      "Content-Type":
        upstream.headers.get("content-type") ?? "application/vnd.android.package-archive",
      "Content-Disposition": attachmentDisposition(build.apkFileName ?? "build.apk"),
    });
    // Lets the browser show real progress and time remaining.
    const length = upstream.headers.get("content-length");
    if (length) headers.set("Content-Length", length);
    res = new NextResponse(upstream.body, { headers });
  }

  const dl = new URL(req.url).searchParams.get("dl");
  if (dl && DOWNLOAD_ID_RE.test(dl)) {
    res.cookies.set(`${DOWNLOAD_COOKIE_PREFIX}${dl}`, "1", { path: "/", maxAge: 60, sameSite: "lax" });
  }
  return res;
}
