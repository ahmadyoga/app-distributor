import "server-only";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export type S3Credentials = {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucket: string;
  endpoint?: string;
};

function client(creds: S3Credentials) {
  return new S3Client({
    region: creds.region || "auto",
    endpoint: creds.endpoint || undefined,
    forcePathStyle: !!creds.endpoint,
    credentials: {
      accessKeyId: creds.accessKeyId,
      secretAccessKey: creds.secretAccessKey,
    },
    // The SDK defaults to adding an x-amz-checksum-* param to presigned
    // requests, which the browser's plain XHR PUT can't reproduce and would
    // break the signature. Presigned URLs don't need this validation.
    requestChecksumCalculation: "WHEN_REQUIRED",
  });
}

export async function presignS3Put(
  creds: S3Credentials,
  key: string,
  contentType: string
) {
  const cmd = new PutObjectCommand({
    Bucket: creds.bucket,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(client(creds), cmd, { expiresIn: 60 * 15 });
}

export async function presignS3Get(creds: S3Credentials, key: string) {
  const cmd = new GetObjectCommand({ Bucket: creds.bucket, Key: key });
  return getSignedUrl(client(creds), cmd, { expiresIn: 60 * 5 });
}

export type S3ObjectSummary = { key: string; size: number; lastModified: Date | null };

/** Lists every object in the bucket — the bucket may be shared with things
 *  outside BuildApp, so callers must cross-reference against known build
 *  object keys rather than assuming everything listed here is ours. */
export async function listS3Objects(creds: S3Credentials): Promise<S3ObjectSummary[]> {
  const results: S3ObjectSummary[] = [];
  let continuationToken: string | undefined;
  do {
    const res = await client(creds).send(
      new ListObjectsV2Command({
        Bucket: creds.bucket,
        ContinuationToken: continuationToken,
      })
    );
    for (const obj of res.Contents ?? []) {
      if (obj.Key) {
        results.push({
          key: obj.Key,
          size: obj.Size ?? 0,
          lastModified: obj.LastModified ?? null,
        });
      }
    }
    continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (continuationToken);
  return results;
}

export async function deleteS3Object(creds: S3Credentials, key: string) {
  await client(creds).send(new DeleteObjectCommand({ Bucket: creds.bucket, Key: key }));
}
