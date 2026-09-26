import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getApplicationBySlug } from "@/lib/queries";
import { getCurrentUser } from "@/lib/dal";
import { CreateBuildForm } from "@/components/CreateBuildForm";
import styles from "../application.module.css";

export default async function NewBuildPage({
  params,
}: PageProps<"/apps/[slug]/new">) {
  const { slug } = await params;
  const [data, user] = await Promise.all([
    getApplicationBySlug(slug),
    getCurrentUser(),
  ]);
  if (!data) notFound();
  if (user.role === "VIEWER") redirect(`/apps/${slug}`);

  const { app, latest } = data;
  const provider = app.defaultStorage?.provider ?? null;

  const suggestedNumber = latest?.number && /^\d+$/.test(latest.number)
    ? String(Number(latest.number) + 1)
    : "";

  return (
    <div style={{ maxWidth: 760 }}>
      <div className={styles.breadcrumb}>
        <Link href={`/apps/${app.slug}`}>{app.name}</Link> / New build
      </div>
      <h1 className={styles.appName} style={{ marginBottom: 6 }}>
        Create build
      </h1>
      <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 26, maxWidth: "58ch", lineHeight: 1.6 }}>
        Version, build number and feature are required. Everything else is
        context that travels with the APK.
      </p>

      <CreateBuildForm
        applicationId={app.id}
        applicationName={app.name}
        storageName={app.defaultStorage?.name ?? null}
        storageProvider={provider}
        suggestedVersion={latest?.version ?? ""}
        suggestedNumber={suggestedNumber}
        lastNumber={latest?.number ?? null}
      />
    </div>
  );
}
