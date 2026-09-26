"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePublisher } from "@/lib/dal";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import { presignS3Put, listS3Objects, deleteS3Object } from "@/lib/storage/s3";
import {
  createResumableUploadSession,
  listDistributionFolderFiles,
  trashDriveFile,
} from "@/lib/storage/gdrive";
import {
  S3ConnectionSchema,
  BuildFormSchema,
  type FormState,
} from "@/app/lib/definitions";
import type { S3Credentials } from "@/lib/storage/s3";

export async function addS3Connection(
  _state: FormState,
  formData: FormData
): Promise<FormState> {
  await requirePublisher();

  const validated = S3ConnectionSchema.safeParse({
    name: formData.get("name"),
    accessKeyId: formData.get("accessKeyId"),
    secretAccessKey: formData.get("secretAccessKey"),
    region: formData.get("region"),
    bucket: formData.get("bucket"),
    endpoint: formData.get("endpoint") || "",
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const { name, accessKeyId, secretAccessKey, region, bucket, endpoint } =
    validated.data;

  const creds: S3Credentials = {
    accessKeyId,
    secretAccessKey,
    region,
    bucket,
    endpoint: endpoint || undefined,
  };

  const existingCount = await prisma.storageConnection.count();

  await prisma.storageConnection.create({
    data: {
      name,
      provider: "S3_COMPATIBLE",
      accountLabel: `${bucket} / ${region}`,
      isDefault: existingCount === 0,
      encryptedCredentials: encryptSecret(JSON.stringify(creds)),
    },
  });

  revalidatePath("/storage");
  redirect("/storage");
}

export async function setDefaultConnection(formData: FormData) {
  await requirePublisher();
  const id = String(formData.get("id"));

  await prisma.$transaction([
    prisma.storageConnection.updateMany({
      data: { isDefault: false },
      where: {},
    }),
    prisma.storageConnection.update({
      where: { id },
      data: { isDefault: true },
    }),
  ]);

  revalidatePath("/storage");
}

export async function disconnectConnection(formData: FormData) {
  await requirePublisher();
  const id = String(formData.get("id"));
  await prisma.storageConnection.delete({ where: { id } });
  revalidatePath("/storage");
}

export async function setApplicationStorage(formData: FormData) {
  await requirePublisher();
  const applicationId = String(formData.get("applicationId"));
  const storageConnectionId = String(formData.get("storageConnectionId"));
  await prisma.application.update({
    where: { id: applicationId },
    data: { defaultStorageId: storageConnectionId },
  });
  revalidatePath("/storage");
}

async function resolveConnectionForApplication(applicationId: string) {
  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { defaultStorage: true },
  });
  if (!app) throw new Error("Application not found");

  const connection =
    app.defaultStorage ??
    (await prisma.storageConnection.findFirst({ where: { isDefault: true } }));

  if (!connection) {
    throw new Error(
      "No storage connected. Connect a storage provider from the Storage page first."
    );
  }
  return connection;
}

export async function presignS3Upload(
  applicationId: string,
  filename: string,
  contentType: string
) {
  await requirePublisher();
  const app = await prisma.application.findUnique({ where: { id: applicationId } });
  if (!app) throw new Error("Application not found");

  const connection = await resolveConnectionForApplication(applicationId);
  if (connection.provider !== "S3_COMPATIBLE") {
    throw new Error("The connected storage for this application is not S3-compatible");
  }

  const creds = JSON.parse(decryptSecret(connection.encryptedCredentials)) as S3Credentials;
  const objectKey = `${app.slug}/${Date.now()}-${filename}`;
  const uploadUrl = await presignS3Put(creds, objectKey, contentType);

  return { uploadUrl, objectKey, storageConnectionId: connection.id };
}

export async function createGDriveUploadSession(
  applicationId: string,
  filename: string,
  mimeType: string
) {
  await requirePublisher();
  const connection = await resolveConnectionForApplication(applicationId);
  if (connection.provider !== "GOOGLE_DRIVE") {
    throw new Error("The connected storage for this application is not Google Drive");
  }

  const { refreshToken } = JSON.parse(
    decryptSecret(connection.encryptedCredentials)
  ) as { refreshToken: string };

  const uploadUrl = await createResumableUploadSession(refreshToken, filename, mimeType);

  return { uploadUrl, storageConnectionId: connection.id };
}

export type FinalizeBuildResult =
  | { ok: true; appSlug: string; number: string }
  | {
      ok: false;
      errors?: Partial<Record<"version" | "number" | "feature", string[]>>;
      message?: string;
    };

export async function finalizeBuild(formData: FormData): Promise<FinalizeBuildResult> {
  const user = await requirePublisher();

  const validated = BuildFormSchema.safeParse({
    applicationId: formData.get("applicationId"),
    version: formData.get("version"),
    number: formData.get("number"),
    feature: formData.get("feature"),
    githubIssue: formData.get("githubIssue") || undefined,
    releaseNotes: formData.get("releaseNotes") || undefined,
    storageConnectionId: formData.get("storageConnectionId"),
    storageObjectKey: formData.get("storageObjectKey"),
    apkFileName: formData.get("apkFileName"),
    apkSizeBytes: formData.get("apkSizeBytes"),
  });

  if (!validated.success) {
    return { ok: false, errors: validated.error.flatten().fieldErrors };
  }

  const data = validated.data;

  const app = await prisma.application.findUnique({ where: { id: data.applicationId } });
  if (!app) return { ok: false, message: "Application not found." };

  const existing = await prisma.build.findUnique({
    where: { applicationId_number: { applicationId: app.id, number: data.number } },
  });
  if (existing) {
    return {
      ok: false,
      message: `Build number ${data.number} already exists for ${app.name}.`,
    };
  }

  const build = await prisma.build.create({
    data: {
      applicationId: app.id,
      version: data.version,
      number: data.number,
      feature: data.feature,
      githubIssue: data.githubIssue || null,
      releaseNotes: data.releaseNotes || null,
      developerId: user.id,
      status: "PUBLISHED",
      storageConnectionId: data.storageConnectionId,
      storageObjectKey: data.storageObjectKey,
      apkFileName: data.apkFileName,
      apkSizeBytes: BigInt(data.apkSizeBytes),
    },
  });

  await prisma.storageConnection.update({
    where: { id: data.storageConnectionId },
    data: { usedBytesApprox: { increment: BigInt(data.apkSizeBytes) } },
  });

  revalidatePath(`/apps/${app.slug}`);
  revalidatePath("/");
  return { ok: true, appSlug: app.slug, number: build.number };
}

export type UnlinkedFile = {
  key: string;
  name: string;
  size: number;
  createdAt: string | null;
  /** Trashed on Drive (recoverable) vs. permanently deleted (S3 has no trash). */
  recoverable: boolean;
};

/** Lists files sitting in a connection's storage that no Build references —
 *  leftovers from uploads that failed, or were abandoned, after the file
 *  landed in storage but before the build record was created. */
export async function findUnlinkedFiles(
  storageConnectionId: string
): Promise<UnlinkedFile[]> {
  await requirePublisher();

  const connection = await prisma.storageConnection.findUnique({
    where: { id: storageConnectionId },
  });
  if (!connection) throw new Error("Storage connection not found");

  const linkedKeys = new Set(
    (
      await prisma.build.findMany({
        where: { storageConnectionId },
        select: { storageObjectKey: true },
      })
    )
      .map((b) => b.storageObjectKey)
      .filter((k): k is string => !!k)
  );

  if (connection.provider === "GOOGLE_DRIVE") {
    const { refreshToken } = JSON.parse(
      decryptSecret(connection.encryptedCredentials)
    ) as { refreshToken: string };
    const files = await listDistributionFolderFiles(refreshToken);
    return files
      .filter((f) => !linkedKeys.has(f.id))
      .map((f) => ({
        key: f.id,
        name: f.name,
        size: f.size,
        createdAt: f.createdTime,
        recoverable: true,
      }));
  }

  const creds = JSON.parse(
    decryptSecret(connection.encryptedCredentials)
  ) as S3Credentials;
  const objects = await listS3Objects(creds);
  return objects
    .filter((o) => !linkedKeys.has(o.key))
    .map((o) => ({
      key: o.key,
      name: o.key,
      size: o.size,
      createdAt: o.lastModified ? o.lastModified.toISOString() : null,
      recoverable: false,
    }));
}

export async function deleteUnlinkedFile(
  storageConnectionId: string,
  fileKey: string
) {
  await requirePublisher();

  const connection = await prisma.storageConnection.findUnique({
    where: { id: storageConnectionId },
  });
  if (!connection) throw new Error("Storage connection not found");

  // Re-check right before deleting — a build may have been published with
  // this exact key in the moments since the list was fetched.
  const stillLinked = await prisma.build.findFirst({
    where: { storageConnectionId, storageObjectKey: fileKey },
  });
  if (stillLinked) {
    throw new Error("This file is linked to a build — refusing to delete it.");
  }

  if (connection.provider === "GOOGLE_DRIVE") {
    const { refreshToken } = JSON.parse(
      decryptSecret(connection.encryptedCredentials)
    ) as { refreshToken: string };
    await trashDriveFile(refreshToken, fileKey);
  } else {
    const creds = JSON.parse(
      decryptSecret(connection.encryptedCredentials)
    ) as S3Credentials;
    await deleteS3Object(creds, fileKey);
  }

  revalidatePath("/storage");
}
