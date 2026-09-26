import Link from "next/link";
import { notFound } from "next/navigation";
import { getApplicationBySlug } from "@/lib/queries";
import { getCurrentUser } from "@/lib/dal";
import { Tile } from "@/components/ui/Tile";
import { LinkButton } from "@/components/ui/Button";
import { StatusTag, toneForBuildStatus } from "@/components/ui/StatusTag";
import { DevAvatar } from "@/components/ui/Tile";
import { TableWrap, TableRow } from "@/components/ui/Table";
import { SectionLabel } from "@/components/ui/Field";
import { CopyButton } from "@/components/CopyButton";
import styles from "./application.module.css";

const COLUMNS = "64px minmax(0,1.7fr) 116px 108px 96px 90px";

export default async function ApplicationPage({
  params,
}: PageProps<"/apps/[slug]">) {
  const { slug } = await params;
  const [data, user] = await Promise.all([
    getApplicationBySlug(slug),
    getCurrentUser(),
  ]);
  if (!data) notFound();

  const { app, latest, versionGroups } = data;
  const readOnly = user.role === "VIEWER";
  const appUrl = `buildapp.com/apps/${app.slug}`;

  return (
    <div>
      <div className={styles.breadcrumb}>
        <Link href="/apps">Applications</Link> / {app.name}
      </div>

      <div className={styles.headerRow}>
        <Tile size="lg">{app.initials}</Tile>
        <div>
          <h1 className={styles.appName}>{app.name}</h1>
          <div className={styles.appSub}>
            {app.platform}
            {app.defaultStorage ? `, uploads to ${app.defaultStorage.name}` : ""}
          </div>
        </div>
        <div className={styles.headerActions}>
          <CopyButton text={appUrl} />
          {!readOnly && (
            <LinkButton href={`/apps/${app.slug}/new`} variant="primary">
              New build
            </LinkButton>
          )}
        </div>
      </div>

      <div className={styles.infoGrid}>
        <div className={styles.infoCell}>
          <SectionLabel>Latest build</SectionLabel>
          {latest ? (
            <>
              <div style={{ display: "flex", alignItems: "baseline", gap: 9, flexWrap: "wrap", marginBottom: 6 }}>
                <span className={styles.latestLabel}>
                  {latest.number} / v{latest.version}
                </span>
                <StatusTag tone={toneForBuildStatus(latest.status)}>{latest.status}</StatusTag>
              </div>
              <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>
                {latest.feature}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 16 }}>
                {latest.developer.name}
              </div>
              <LinkButton href={`/apps/${app.slug}/builds/${latest.number}`}>
                Open build page
              </LinkButton>
            </>
          ) : (
            <p style={{ fontSize: 13, color: "var(--muted)" }}>No builds yet.</p>
          )}
        </div>
        <div className={styles.infoCell}>
          <SectionLabel>Permanent application link</SectionLabel>
          <div className={styles.linkBox}>{appUrl}</div>
          <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>
            Shows the full build history. Share it once, it never changes.
          </p>
        </div>
      </div>

      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>Build history</h2>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>Grouped by version</span>
      </div>

      {versionGroups.length === 0 && (
        <p style={{ fontSize: 13, color: "var(--muted)" }}>No builds yet.</p>
      )}

      {versionGroups.map((group) => (
        <div key={group.version} className={styles.versionGroup}>
          <div className={styles.versionHead}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600 }}>
              v{group.version}
            </span>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>
              {group.builds.length} build{group.builds.length === 1 ? "" : "s"}
            </span>
            <span className={styles.versionRule} />
          </div>
          <TableWrap>
            {group.builds.map((b) => (
              <Link
                key={b.id}
                href={`/apps/${app.slug}/builds/${b.number}`}
                style={{ color: "inherit", display: "contents" }}
              >
                <TableRow columns={COLUMNS}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600 }}>
                    {b.number}
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <span
                      style={{
                        display: "block",
                        fontSize: 13,
                        fontWeight: 500,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {b.feature}
                    </span>
                    <span style={{ display: "block", fontSize: 11, color: "var(--muted)" }}>
                      {b.githubIssue ? `GitHub ${b.githubIssue}` : "No issue linked"}
                    </span>
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                    <DevAvatar name={b.developer.name} />
                    <span
                      style={{
                        fontSize: 12,
                        color: "var(--muted)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {b.developer.name}
                    </span>
                  </span>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>
                    {b.createdAt.toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                  <StatusTag tone={toneForBuildStatus(b.status)}>{b.status}</StatusTag>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted)", textAlign: "right" }}>
                    {b.apkSizeBytes ? `${(Number(b.apkSizeBytes) / 1024 / 1024).toFixed(1)} MB` : "—"}
                  </span>
                </TableRow>
              </Link>
            ))}
          </TableWrap>
        </div>
      ))}
    </div>
  );
}
