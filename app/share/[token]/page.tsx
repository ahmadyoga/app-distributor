import { cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { formatBytes } from "@/lib/format";
import { StatusTag, toneForEnvironment } from "@/components/ui/StatusTag";
import { Tile } from "@/components/ui/Tile";
import { Logo } from "@/components/ui/Misc";
import { DownloadButton } from "@/components/DownloadButton";
import terminal from "@/components/ui/terminal.module.css";
import styles from "./share.module.css";

// cache(): generateMetadata and the page share one lookup per request.
const getSharedBuild = cache(async (token: string) =>
  prisma.build.findUnique({
    where: { shareToken: token },
    include: { application: true, developer: { select: { name: true } } },
  })
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const build = await getSharedBuild(token);

  // Share links are unlisted — keep them out of search engines.
  const robots = { index: false, follow: false };
  if (!build) return { title: "Link unavailable — BuildApp", robots };

  const env = build.environment === "STAGING" ? "Staging" : "Production";
  const title = `${build.feature} — ${build.application.name}`;
  const description = `Build ${build.number} · v${build.version} · ${env}`;
  return {
    title: `${title} · Build ${build.number}`,
    description,
    robots,
    openGraph: { title, description, url: `/share/${token}`, siteName: "BuildApp", type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const build = await getSharedBuild(token);
  if (!build) notFound();

  const app = build.application;
  const isStaging = build.environment === "STAGING";
  const notes = (build.releaseNotes ?? "")
    .split("\n")
    .map((n) => n.trim())
    .filter(Boolean);
  const published = build.createdAt.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Logo />
        <span className={styles.headerNote}>Shared build</span>
      </header>

      <main className={styles.main}>
        <div className={styles.appRow}>
          <Tile size="lg">{app.initials}</Tile>
          <div style={{ minWidth: 0 }}>
            <div className={styles.appName}>{app.name}</div>
            <div className={styles.platform}>{app.platform}</div>
          </div>
        </div>

        <div className={styles.eyebrow}>Feature</div>
        <h1 className={styles.feature}>{build.feature}</h1>

        <div className={styles.badges}>
          <span className={terminal.buildNo}>Build {build.number}</span>
          <span className={terminal.versionTag}>v{build.version}</span>
          <StatusTag tone={toneForEnvironment(build.environment)}>{build.environment}</StatusTag>
          {build.hasInspector && <StatusTag tone="warn">Inspector</StatusTag>}
        </div>

        {isStaging && (
          <div className={styles.stagingNote}>
            <strong>Staging build.</strong> It talks to test servers — use test accounts, not
            real ones.
          </div>
        )}

        <section className={styles.download}>
          {build.status === "PROCESSING" ? (
            <div className={styles.processing}>
              <StatusTag tone="warn">Processing</StatusTag>
              <p>
                The APK is still uploading. Refresh this page in a minute — the link stays the
                same.
              </p>
            </div>
          ) : (
            <>
              <DownloadButton href={`/api/share/${token}/download`} />
              <div className={styles.fileLine}>
                {build.apkFileName ?? "app.apk"}
                {build.apkSizeBytes ? ` · ${formatBytes(build.apkSizeBytes)}` : ""}
              </div>
            </>
          )}

          <details className={styles.help}>
            <summary>How to install on Android</summary>
            <ol>
              <li>Tap <strong>Download APK</strong> on your Android phone.</li>
              <li>Open the downloaded file from the notification or your Downloads folder.</li>
              <li>
                If Android blocks it, allow <strong>Install unknown apps</strong> for your
                browser, then go back and open the file again.
              </li>
              <li>
                Seeing <strong>“App not installed”</strong>? Uninstall the version already on the
                phone first — builds signed differently, or older than the installed one,
                can&apos;t install over it.
              </li>
            </ol>
          </details>
        </section>

        {notes.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionLabel}>What&apos;s new</h2>
            <ul className={styles.notes}>
              {notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </section>
        )}

        <section className={styles.section}>
          <h2 className={styles.sectionLabel}>Build details</h2>
          <dl className={styles.meta}>
            {[
              ["Feature", build.feature],
              ["Version", `v${build.version}`],
              ["Build number", build.number],
              ["Environment", isStaging ? "Staging" : "Production"],
              ["Published", published],
              ["Published by", build.developer.name],
            ].map(([k, v]) => (
              <div key={k} className={styles.metaRow}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>

      <footer className={styles.footer}>
        Shared through BuildApp. The team can disable this link at any time.
      </footer>
    </div>
  );
}
