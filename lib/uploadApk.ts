// Browser-side: sends an APK to the application's connected storage and
// returns where it landed. Shared by Create build and Replace APK.

import { presignS3Upload, createGDriveUploadSession } from "@/app/actions/storage";
import { uploadToDriveSession } from "@/lib/driveUpload";

export type StorageProviderKind = "GOOGLE_DRIVE" | "S3_COMPATIBLE";
export type RetryInfo = { attempt: number; max: number; reason: string };

function xhrPut(
  url: string,
  file: File,
  contentType: string,
  onProgress: (pct: number) => void
): Promise<XMLHttpRequest> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url, true);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve(xhr);
      else reject(new Error(`Upload failed (HTTP ${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("Upload failed — network error"));
    xhr.send(file);
  });
}

export async function uploadApk(
  applicationId: string,
  provider: StorageProviderKind,
  file: File,
  callbacks: { onProgress: (pct: number) => void; onRetry: (info: RetryInfo | null) => void }
): Promise<{ storageConnectionId: string; storageObjectKey: string }> {
  const contentType = file.type || "application/vnd.android.package-archive";

  if (provider === "S3_COMPATIBLE") {
    const presigned = await presignS3Upload(applicationId, file.name, contentType);
    await xhrPut(presigned.uploadUrl, file, contentType, callbacks.onProgress);
    return { storageConnectionId: presigned.storageConnectionId, storageObjectKey: presigned.objectKey };
  }

  const session = await createGDriveUploadSession(applicationId, file.name, contentType);
  // Chunked + resumable: a dropped connection resumes instead of restarting.
  const storageObjectKey = await uploadToDriveSession(session.uploadUrl, file, contentType, callbacks);
  callbacks.onRetry(null);
  return { storageConnectionId: session.storageConnectionId, storageObjectKey };
}
