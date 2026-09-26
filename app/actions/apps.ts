"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { requirePublisher } from "@/lib/dal";
import { ApplicationSchema, type FormState } from "@/app/lib/definitions";

export async function addApplication(
  _state: FormState,
  formData: FormData
): Promise<FormState> {
  await requirePublisher();

  const validated = ApplicationSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    platform: formData.get("platform"),
    initials: formData.get("initials"),
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const { name, slug, platform, initials } = validated.data;

  const exists = await prisma.application.findUnique({ where: { slug } });
  if (exists) {
    return { errors: { slug: ["Slug already in use."] } };
  }

  await prisma.application.create({
    data: { name, slug, platform, initials },
  });

  revalidatePath("/storage");
  revalidatePath("/apps");
  redirect("/storage");
}

export async function updateApplication(
  _state: FormState,
  formData: FormData
): Promise<FormState> {
  await requirePublisher();

  const id = String(formData.get("id"));

  const validated = ApplicationSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    platform: formData.get("platform"),
    initials: formData.get("initials"),
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const { name, slug, platform, initials } = validated.data;

  const conflict = await prisma.application.findFirst({
    where: { slug, NOT: { id } },
  });
  if (conflict) {
    return { errors: { slug: ["Slug already in use by another app."] } };
  }

  await prisma.application.update({
    where: { id },
    data: { name, slug, platform, initials },
  });

  revalidatePath("/storage");
  revalidatePath("/apps");
  redirect("/storage");
}

export async function deleteApplication(formData: FormData) {
  await requirePublisher();
  const id = String(formData.get("id"));
  await prisma.application.delete({ where: { id } });
  revalidatePath("/storage");
  revalidatePath("/apps");
}

export async function deleteBuild(formData: FormData) {
  await requirePublisher();
  const id = String(formData.get("id"));
  const build = await prisma.build.findUnique({
    where: { id },
    include: { application: true },
  });
  if (!build) throw new Error("Build not found");
  await prisma.build.delete({ where: { id } });
  revalidatePath(`/apps/${build.application.slug}`);
  redirect(`/apps/${build.application.slug}`);
}

export async function generateShareToken(buildId: string): Promise<string> {
  await requirePublisher();
  const existing = await prisma.build.findUnique({
    where: { id: buildId },
    select: { shareToken: true },
  });
  if (!existing) throw new Error("Build not found");
  if (existing.shareToken) {
    const base = process.env.BASE_URL ?? "http://localhost:3000";
    return `${base}/share/${existing.shareToken}`;
  }

  const token = randomBytes(18).toString("base64url");
  await prisma.build.update({
    where: { id: buildId },
    data: { shareToken: token },
  });
  revalidatePath(`/share/${token}`);
  const base = process.env.BASE_URL ?? "http://localhost:3000";
  return `${base}/share/${token}`;
}
