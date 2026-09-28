import "server-only";
import type { StorageConnection } from "@prisma/client";
import { decryptSecret } from "@/lib/crypto";
import { deleteS3Object, type S3Credentials } from "@/lib/storage/s3";
import { trashDriveFile } from "@/lib/storage/gdrive";

/** Removes a stored APK: Drive files go to the trash, S3 objects are deleted. */
export async function removeStoredObject(
  connection: Pick<StorageConnection, "provider" | "encryptedCredentials">,
  key: string
) {
  const secret = decryptSecret(connection.encryptedCredentials);
  if (connection.provider === "GOOGLE_DRIVE") {
    const { refreshToken } = JSON.parse(secret) as { refreshToken: string };
    await trashDriveFile(refreshToken, key);
  } else {
    await deleteS3Object(JSON.parse(secret) as S3Credentials, key);
  }
}
