import Link from "next/link";
import { notFound } from "next/navigation";
import { getBuild } from "@/lib/queries";
import { getCurrentUser } from "@/lib/dal";
import { absoluteUrl } from "@/lib/url";
import { StatusTag, toneForBuildStatus, toneForEnvironment } from "@/components/ui/StatusTag";
import { Tile } from "@/components/ui/Tile";
import { LinkButton } from "@/components/ui/Button";
import { SectionLabel } from "@/components/ui/Field";
import { DownloadIcon } from "@/components/ui/icons";
import terminal from "@/components/ui/terminal.module.css";
import styles from "./build.module.css";
import { DeleteBuildButton } from "@/components/DeleteBuildButton";
import { SharePanel } from "@/components/SharePanel";
import { TicketCommentStatus } from "@/components/TicketCommentStatus";

export default async function BuildPage({
  params,
}: PageProps<"/apps/[slug]/builds/[id]">) {
  const { slug, id } = await params;
  const [data, user] = await Promise.all([getBuild(slug, id), getCurrentUser()]);
  if (!data) notFound();

  const { app, build, siblings } = data;
  const canManage = user.role === "PUBLISHER";
  const notes = (build.releaseNotes ?? "")
    .split("\n")
    .map((n) => n.trim())
    .filter(Boolean);

  return (
    <div>
      <div className={styles.topbar}>
        <nav className={styles.path} aria-label="Breadcrumb">
          <Link href="/apps">Applications</Link> / <Link href={`/apps/${app.slug}`}>{app.name}</Link>{" "}
          / <span style={{ color: "var(--ink)" }}>Build {build.number}</span>
        </nav>
        {canManage && (
          <span style={{ marginLeft: "auto" }}>
            <DeleteBuildButton buildId={build.id} />
          </span>
        )}
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
              <StatusTag tone={toneForEnvironment(build.environment)}>{build.environment}</StatusTag>
              {build.hasInspector && <StatusTag tone="warn">Inspector</StatusTag>}
            </div>
            <h2 className={styles.feature}>{build.feature}</h2>
            {build.tickets.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {build.tickets.map((t) => (
                  <a
                    key={t.id}
                    href={t.htmlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "7px 10px",
                      border: "1px solid var(--line-strong)",
                      borderRadius: "var(--r-sm)",
                      background: "var(--surface-2)",
                      textDecoration: "none",
                      fontSize: 12,
                    }}
                  >
                    <span style={{ color: "var(--muted)", fontFamily: "var(--font-mono)", flexShrink: 0 }}>
                      {t.repo}
                    </span>
                    <span style={{ color: "var(--accent)", fontFamily: "var(--font-mono)", fontWeight: 700, flexShrink: 0 }}>
                      #{t.number}
                    </span>
                    <span style={{ color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                      {t.title}
                    </span>
                  </a>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: "var(--muted)" }}>No tickets linked</p>
            )}
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
                { k: "Version", v: `v${build.version}`, mono: true },
                { k: "Build number", v: build.number, mono: true },
                {
                  k: "Environment",
                  v: build.environment === "STAGING" ? "Staging" : "Production",
                },
                { k: "Inspector", v: build.hasInspector ? "Included" : "Not included" },
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

          <SharePanel
            buildId={build.id}
            initialUrl={build.shareToken ? absoluteUrl(`/share/${build.shareToken}`) : null}
            canManage={canManage}
          />

          {siblings.length > 0 && (
            <div>
              <SectionLabel>Other builds in v{build.version}</SectionLabel>
              <div style={{ borderTop: "var(--bw) solid var(--line)" }}>
                {siblings.map((s) => (
                  <Link
                    key={s.id}
                    href={`/apps/${app.slug}/builds/${s.id}`}
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

      {build.tickets.length > 0 && (
        <TicketCommentStatus buildId={build.id} buildCreatedAt={build.createdAt} />
      )}
    </div>
  );
}
