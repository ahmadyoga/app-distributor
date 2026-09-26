import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { StatusTag, toneForBuildStatus } from "@/components/ui/StatusTag";
import { Tile } from "@/components/ui/Tile";
import { LinkButton } from "@/components/ui/Button";
import { SectionLabel } from "@/components/ui/Field";
import { DownloadIcon } from "@/components/ui/icons";
import terminal from "@/components/ui/terminal.module.css";
import styles from "@/app/(app)/apps/[slug]/builds/[number]/build.module.css";


export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const build = await prisma.build.findUnique({
    where: { shareToken: token },
    include: { application: true, developer: true },
  });

  if (!build) return { title: "Build not found" };

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "";
  return {
    title: `${build.feature} — ${build.application.name} Build ${build.number}`,
    description: `v${build.version} · ${build.developer.name}${build.releaseNotes ? " · " + build.releaseNotes.split("\n")[0].trim() : ""}`,
    openGraph: {
      title: `${build.feature} — ${build.application.name}`,
      description: `Build ${build.number} · v${build.version} · by ${build.developer.name}`,
      url: `${base}/share/${token}`,
      siteName: "BuildApp",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${build.feature} — ${build.application.name}`,
      description: `Build ${build.number} · v${build.version} · by ${build.developer.name}`,
    },
  };
}

export default async function SharePage({
  params,
}: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const build = await prisma.build.findUnique({
    where: { shareToken: token },
    include: {
      application: true,
      developer: true,
      tickets: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!build) notFound();

  const app = build.application;
  const notes = (build.releaseNotes ?? "")
    .split("\n")
    .map((n) => n.trim())
    .filter(Boolean);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-outer)",
        color: "var(--ink)",
        fontFamily: "var(--font)",
        padding: "32px 24px",
        maxWidth: 900,
        margin: "0 auto",
      }}
    >
      <div className={styles.grid}>
        <div className={styles.left}>
          <div className={styles.headRow}>
            <Tile size="lg">{app.initials}</Tile>
            <div>
              <h1 className={styles.appName}>{app.name}</h1>
              <div className={styles.platform}>{app.platform}</div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div className={styles.badgeRow}>
              <span className={terminal.buildNo}>Build {build.number}</span>
              <span className={terminal.versionTag}>v{build.version}</span>
              <StatusTag tone={toneForBuildStatus(build.status)}>
                {build.status}
              </StatusTag>
            </div>
            <h2 className={styles.feature}>{build.feature}</h2>
            <p style={{ fontSize: 13, color: "var(--muted)" }}>
              {build.tickets?.length
                ? `${build.tickets.length} ticket${build.tickets.length > 1 ? "s" : ""} linked`
                : "No tickets linked"}
            </p>
          </div>

          {notes.length > 0 && (
            <div className={styles.notesBlock}>
              <SectionLabel>Release notes</SectionLabel>
              <ul className={styles.notesList}>
                {notes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className={styles.right}>
          <div className={styles.downloadCard}>
            {build.status === "PROCESSING" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <StatusTag tone="warn">Processing</StatusTag>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>
                    Preparing the APK
                  </span>
                </div>
                <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>
                  This build is still uploading. The link already works and will
                  serve the file once it lands.
                </p>
              </div>
            ) : (
              <div>
                <LinkButton
                  href={`/api/share/${token}/download`}
                  variant="primary"
                  size="lg"
                  block
                >
                  <DownloadIcon /> Download APK
                </LinkButton>
                <div className={styles.fileLine}>
                  {build.apkFileName ?? "apk"}
                  {build.apkSizeBytes
                    ? ` / ${(Number(build.apkSizeBytes) / 1024 / 1024).toFixed(1)} MB`
                    : ""}
                </div>
              </div>
            )}

            <div className={styles.divider} />

            <div style={{ display: "flex", flexDirection: "column" }}>
              {[
                { k: "Application", v: app.name },
                { k: "Version", v: `v${build.version}`, mono: true },
                { k: "Build number", v: build.number, mono: true },
                { k: "Feature", v: build.feature },
                { k: "Developer", v: build.developer.name },
                {
                  k: "Created",
                  v: build.createdAt.toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  }),
                },
              ].map((row) => (
                <div className={styles.metaRow} key={row.k}>
                  <span className={styles.metaKey}>{row.k}</span>
                  <span
                    className={styles.metaVal}
                    style={row.mono ? { fontFamily: "var(--font-mono)" } : undefined}
                  >
                    {row.v}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
