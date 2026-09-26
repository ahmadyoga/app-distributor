import Link from "next/link";
import { notFound } from "next/navigation";
import { getBuild } from "@/lib/queries";
import { StatusTag, toneForBuildStatus } from "@/components/ui/StatusTag";
import { Tile } from "@/components/ui/Tile";
import { LinkButton } from "@/components/ui/Button";
import { SectionLabel } from "@/components/ui/Field";
import { DownloadIcon } from "@/components/ui/icons";
import terminal from "@/components/ui/terminal.module.css";
import styles from "./build.module.css";
import { DeleteBuildButton } from "@/components/DeleteBuildButton";
import { ShareBuildButton } from "@/components/ShareBuildButton";

export default async function BuildPage({
  params,
}: PageProps<"/apps/[slug]/builds/[number]">) {
  const { slug, number } = await params;
  const data = await getBuild(slug, number);
  if (!data) notFound();

  const { app, build, siblings } = data;
  const buildUrl = `buildapp.com/apps/${app.slug}/builds/${build.number}`;
  const notes = (build.releaseNotes ?? "")
    .split("\n")
    .map((n) => n.trim())
    .filter(Boolean);

  return (
    <div>
      <div className={styles.topbar}>
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: "var(--r-sm)",
            background: "var(--primary-bg)",
          }}
        />
        <span className={styles.path}>{buildUrl}</span>
        <LinkButton href={`/apps/${app.slug}`} variant="ghost" size="sm">
          All builds
        </LinkButton>
        <DeleteBuildButton buildId={build.id} />
        <ShareBuildButton buildId={build.id} existingToken={build.shareToken ?? null} />
      </div>

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
              <StatusTag tone={toneForBuildStatus(build.status)}>{build.status}</StatusTag>
            </div>
            <h2 className={styles.feature}>{build.feature}</h2>
            <p style={{ fontSize: 13, color: "var(--muted)" }}>
              {build.githubIssue
                ? `Linked to GitHub issue ${build.githubIssue}`
                : "No GitHub issue linked"}
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
                  <span style={{ fontSize: 13, fontWeight: 500 }}>Preparing the APK</span>
                </div>
                <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>
                  This build is still uploading. The link already works and
                  will serve the file once it lands.
                </p>
              </div>
            ) : (
              <div>
                <LinkButton
                  href={`/api/builds/${build.id}/download`}
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

          {siblings.length > 0 && (
            <div>
              <SectionLabel>Other builds in v{build.version}</SectionLabel>
              <div style={{ borderTop: "var(--bw) solid var(--line)" }}>
                {siblings.map((s) => (
                  <Link
                    key={s.id}
                    href={`/apps/${app.slug}/builds/${s.number}`}
                    className={terminal.siblingRow}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 12,
                        fontWeight: 600,
                        minWidth: 42,
                      }}
                    >
                      {s.number}
                    </span>
                    <span style={{ fontSize: 13, color: "var(--ink-soft)", minWidth: 0 }}>
                      {s.feature}
                    </span>
                    <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--muted)" }}>
                      {s.developer.name}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <ShareBuildButton buildId={build.id} existingToken={build.shareToken ?? null} link />
      </div>
    </div>
  );
}
