import Link from "next/link";
import { listApplications } from "@/lib/queries";
import { formatBytes } from "@/lib/format";
import { Tile } from "@/components/ui/Tile";
import { StatusTag, toneForEnvironment } from "@/components/ui/StatusTag";
import { TableWrap, TableHeadRow, TableRow } from "@/components/ui/Table";
import styles from "../dashboard.module.css";

const COLUMNS = "minmax(0,1.6fr) 90px 110px 130px";

export default async function ApplicationsPage() {
  const apps = await listApplications();

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Applications</h1>
          <p className={styles.subtitle}>
            {apps.length} application{apps.length === 1 ? "" : "s"}.
          </p>
        </div>
      </div>

      <TableWrap>
        <TableHeadRow columns={COLUMNS}>
          <span>Application</span>
          <span>Builds</span>
          <span>Storage used</span>
          <span>Latest build</span>
        </TableHeadRow>
        {apps.length === 0 && (
          <div style={{ padding: 24, fontSize: 13, color: "var(--muted)" }}>
            No applications yet.
          </div>
        )}
        {apps.map((app) => (
          <Link
            key={app.id}
            href={`/apps/${app.slug}`}
            style={{ color: "inherit", display: "contents" }}
          >
            <TableRow columns={COLUMNS}>
              <span style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
                <Tile size="sm">{app.initials}</Tile>
                <span style={{ minWidth: 0 }}>
                  <span
                    style={{
                      display: "block",
                      fontSize: 14,
                      fontWeight: 600,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {app.name}
                  </span>
                  <span style={{ display: "block", fontSize: 11, color: "var(--muted)" }}>
                    {app.platform}
                  </span>
                </span>
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>
                {app.buildCount}
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>
                {formatBytes(app.usedBytes)}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--muted)" }}>
                {app.latest ? (
                  <>
                    {app.latest.number} / v{app.latest.version}
                    <StatusTag tone={toneForEnvironment(app.latest.environment)}>
                      {app.latest.environment}
                    </StatusTag>
                  </>
                ) : (
                  "—"
                )}
              </span>
            </TableRow>
          </Link>
        ))}
      </TableWrap>
    </div>
  );
}
