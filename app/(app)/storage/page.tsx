import {
  listStorageConnections,
  getApplicationStorageMap,
} from "@/lib/queries";
import { getCurrentUser } from "@/lib/dal";
import { isGoogleDriveConfigured } from "@/lib/storage/gdrive";
import { formatBytes } from "@/lib/format";
import { setDefaultConnection, disconnectConnection } from "@/app/actions/storage";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Tile } from "@/components/ui/Tile";
import { TableWrap, TableHeadRow, TableRow } from "@/components/ui/Table";
import { AddStorageDialog } from "@/components/AddStorageDialog";
import { AppStorageSelect } from "@/components/AppStorageSelect";
import { ManageAppsDialog } from "@/components/ManageAppsDialog";
import { CleanupStorageDialog } from "@/components/CleanupStorageDialog";
import styles from "./storage.module.css";

const CONN_COLUMNS = "minmax(0,1.4fr) minmax(0,1.2fr) 100px 140px 230px";
const APP_COLUMNS = "auto 1fr auto auto";

export default async function StoragePage() {
  const [connections, apps, user] = await Promise.all([
    listStorageConnections(),
    getApplicationStorageMap(),
    getCurrentUser(),
  ]);

  const readOnly = user.role === "VIEWER";

  const appList = apps.map((a) => ({
    id: a.id,
    name: a.name,
    slug: a.slug,
    platform: a.platform,
    initials: a.initials,
  }));

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Storage</h1>
          <p className={styles.subtitle}>
            Builds upload to storage you own. Connect several accounts and
            pick a destination per application.
          </p>
        </div>
        {!readOnly && (
          <AddStorageDialog googleDriveConfigured={isGoogleDriveConfigured()} />
        )}
      </div>

      <div style={{ marginTop: 20, marginBottom: 28 }}>
        <TableWrap>
          <TableHeadRow columns={CONN_COLUMNS}>
            <span>Account</span>
            <span>Provider</span>
            <span>Used</span>
            <span>Applications</span>
            <span></span>
          </TableHeadRow>
          {connections.length === 0 && (
            <div style={{ padding: 24, fontSize: 13, color: "var(--muted)" }}>
              No storage connected yet.
            </div>
          )}
          {connections.map((c) => (
            <TableRow columns={CONN_COLUMNS} key={c.id}>
              <span style={{ minWidth: 0 }}>
                <span
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {c.name}
                </span>
                <span
                  style={{
                    display: "block",
                    fontSize: 11,
                    color: "var(--muted)",
                    overflowWrap: "anywhere",
                  }}
                >
                  {c.accountLabel}
                </span>
              </span>
              <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>
                {c.provider === "GOOGLE_DRIVE" ? "Google Drive" : "S3-compatible"}
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>
                {formatBytes(c.usedBytesApprox)}
              </span>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>
                {c.applications.map((a) => a.name).join(", ") || "—"}
              </span>
              <span style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
                {!readOnly && (
                  <>
                    <CleanupStorageDialog storageConnectionId={c.id} connectionName={c.name} />
                    <form action={setDefaultConnection}>
                      <input type="hidden" name="id" value={c.id} />
                      <SubmitButton variant="ghost" size="sm" disabled={c.isDefault} pendingLabel="Saving…">
                        {c.isDefault ? "Default" : "Set default"}
                      </SubmitButton>
                    </form>
                    <form action={disconnectConnection}>
                      <input type="hidden" name="id" value={c.id} />
                      <SubmitButton variant="danger" size="sm" pendingLabel="Disconnecting…">
                        Disconnect
                      </SubmitButton>
                    </form>
                  </>
                )}
              </span>
            </TableRow>
          ))}
        </TableWrap>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <h2 className={styles.sectionTitle} style={{ marginBottom: 0 }}>
          Destination per application
        </h2>
        {!readOnly && <ManageAppsDialog apps={appList} />}
      </div>

      <TableWrap>
        {apps.length === 0 && (
          <div style={{ padding: 24, fontSize: 13, color: "var(--muted)" }}>
            No applications yet. Add one with &ldquo;Manage apps&rdquo;.
          </div>
        )}
        {apps.map((app) => (
          <TableRow columns={APP_COLUMNS} key={app.id}>
            <Tile size="sm">{app.initials}</Tile>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{app.name}</span>
            <span style={{ fontSize: 13, color: "var(--muted)" }}>
              {app.defaultStorage?.name ?? "No storage set"}
            </span>
            {!readOnly && (
              <AppStorageSelect
                applicationId={app.id}
                currentStorageId={app.defaultStorageId ?? null}
                options={connections.map((c) => ({ id: c.id, name: c.name }))}
              />
            )}
          </TableRow>
        ))}
      </TableWrap>
    </div>
  );
}
