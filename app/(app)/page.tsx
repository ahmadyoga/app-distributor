import Link from "next/link";
import { getDashboardStats, getRecentBuilds } from "@/lib/queries";
import { getCurrentUser } from "@/lib/dal";
import { formatBytes } from "@/lib/format";
import { StatusTag, toneForBuildStatus } from "@/components/ui/StatusTag";
import { DevAvatar } from "@/components/ui/Tile";
import { TableWrap, TableHeadRow, TableRow } from "@/components/ui/Table";
import { BannerWarn } from "@/components/ui/Misc";
import terminal from "@/components/ui/terminal.module.css";
import styles from "./dashboard.module.css";

const COLUMNS = "70px minmax(0,1.6fr) minmax(0,1fr) 90px 110px 96px";

export default async function DashboardPage() {
  const [stats, recent, user] = await Promise.all([
    getDashboardStats(),
    getRecentBuilds(7),
    getCurrentUser(),
  ]);

  const readOnly = user.role === "VIEWER";

  return (
    <div>
      {readOnly && (
        <BannerWarn>
          <strong>Read-only access.</strong> You can view and download builds.
          Ask a workspace admin for the Publisher role to create builds or
          change storage.
        </BannerWarn>
      )}

      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Builds</h1>
          <p className={styles.subtitle}>
            {stats.applicationCount} application
            {stats.applicationCount === 1 ? "" : "s"}, {stats.buildsThisWeek}{" "}
            builds published this week.
          </p>
        </div>
        <Link href="/apps" className={terminal.linkBtn} style={{ marginLeft: "auto" }}>
          Browse applications
        </Link>
      </div>

      <div className={styles.statsGrid}>
        <StatTile k="Builds this week" v={String(stats.buildsThisWeek)} sub="across all applications" />
        <StatTile k="Published today" v={String(stats.publishedToday)} sub="builds marked published" />
        <StatTile
          k="Storage used"
          v={formatBytes(stats.storageUsedBytes)}
          sub="across connected storage"
        />
        <StatTile
          k="Open issues linked"
          v={String(stats.openIssuesLinked)}
          sub="distinct GitHub references"
        />
      </div>

      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>Recent builds</h2>
        <span className={styles.sectionSub}>All applications</span>
      </div>

      <TableWrap>
        <TableHeadRow columns={COLUMNS}>
          <span>Build</span>
          <span>Feature</span>
          <span>Application</span>
          <span>Version</span>
          <span>Developer</span>
          <span>Status</span>
        </TableHeadRow>
        {recent.length === 0 && (
          <div style={{ padding: 24, fontSize: 13, color: "var(--muted)" }}>
            No builds published yet.
          </div>
        )}
        {recent.map((b) => (
          <Link
            key={b.id}
            href={`/apps/${b.application.slug}/builds/${b.number}`}
            style={{ color: "inherit", display: "contents" }}
          >
            <TableRow columns={COLUMNS}>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {b.number}
              </span>
              <span style={{ minWidth: 0 }}>
                <span className={styles.ellipsis}>{b.feature}</span>
                <span className={styles.subCell}>
                  {b.tickets?.length ? `${b.tickets.length} ticket${b.tickets.length > 1 ? "s" : ""} linked` : "No tickets linked"}
                </span>
              </span>
              <span className={styles.ellipsis} style={{ color: "var(--ink-soft)" }}>
                {b.application.name}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  color: "var(--ink-soft)",
                }}
              >
                {b.version}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                <DevAvatar name={b.developer.name} />
                <span className={styles.ellipsis} style={{ fontSize: 12, color: "var(--muted)" }}>
                  {b.developer.name}
                </span>
              </span>
              <StatusTag tone={toneForBuildStatus(b.status)}>{b.status}</StatusTag>
            </TableRow>
          </Link>
        ))}
      </TableWrap>
    </div>
  );
}

function StatTile({ k, v, sub }: { k: string; v: string; sub: string }) {
  return (
    <div className={styles.statTile}>
      <span className={styles.statK}>{k}</span>
      <span className={styles.statV}>{v}</span>
      <span className={styles.statSub}>{sub}</span>
    </div>
  );
}
