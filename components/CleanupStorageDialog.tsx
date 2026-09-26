"use client";

import { useState } from "react";
import {
  findUnlinkedFiles,
  deleteUnlinkedFile,
  type UnlinkedFile,
} from "@/app/actions/storage";
import { Button } from "@/components/ui/Button";
import { formatBytes } from "@/lib/format";
import styles from "@/app/(app)/storage/storage.module.css";

export function CleanupStorageDialog({
  storageConnectionId,
  connectionName,
}: {
  storageConnectionId: string;
  connectionName: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<UnlinkedFile[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  async function openAndScan() {
    setOpen(true);
    setLoading(true);
    setError(null);
    try {
      setFiles(await findUnlinkedFiles(storageConnectionId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to scan storage.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(key: string) {
    setDeletingKey(key);
    setError(null);
    try {
      await deleteUnlinkedFile(storageConnectionId, key);
      setFiles((prev) => prev?.filter((f) => f.key !== key) ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete file.");
    } finally {
      setDeletingKey(null);
    }
  }

  async function handleDeleteAll() {
    if (!files || files.length === 0) return;
    const permanent = files.some((f) => !f.recoverable);
    const ok = window.confirm(
      `Delete all ${files.length} unlinked file(s) from ${connectionName}? ` +
        (permanent
          ? "This storage has no trash — deletion is permanent."
          : "Drive files go to trash and can be recovered for about 30 days.")
    );
    if (!ok) return;
    for (const f of files) {
      await handleDelete(f.key);
    }
  }

  function close() {
    setOpen(false);
    setFiles(null);
    setError(null);
  }

  return (
    <>
      <Button type="button" variant="ghost" size="sm" onClick={openAndScan}>
        Clean up
      </Button>

      {open && (
        <div className={styles.scrim} onClick={close}>
          <div
            className={styles.dialog}
            style={{ width: "min(640px, 100%)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className={styles.dialogTitle}>Unlinked files — {connectionName}</h2>
            <p className={styles.dialogSub}>
              Files sitting in storage that no build references — leftovers
              from uploads that never finished.
            </p>

            {loading && (
              <p style={{ fontSize: 13, color: "var(--muted)" }}>Scanning…</p>
            )}

            {error && (
              <p style={{ fontSize: 13, color: "var(--danger)", marginBottom: 12 }}>
                {error}
              </p>
            )}

            {!loading && files && files.length === 0 && (
              <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>
                No unlinked files found.
              </p>
            )}

            {!loading && files && files.length > 0 && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  maxHeight: 320,
                  overflowY: "auto",
                  marginBottom: 16,
                }}
              >
                {files.map((f) => (
                  <div
                    key={f.key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 10px",
                      border: "var(--bw) solid var(--line)",
                      borderRadius: "var(--r-sm)",
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 12,
                          overflowWrap: "anywhere",
                        }}
                      >
                        {f.name}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>
                        {formatBytes(f.size)}
                        {f.createdAt ? ` · ${new Date(f.createdAt).toLocaleString()}` : ""}
                        {f.recoverable ? " · goes to trash" : " · deleted permanently"}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      disabled={deletingKey === f.key}
                      onClick={() => handleDelete(f.key)}
                    >
                      {deletingKey === f.key ? "Deleting…" : "Delete"}
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <Button type="button" variant="ghost" size="md" onClick={close}>
                Close
              </Button>
              {!loading && files && files.length > 0 && (
                <Button type="button" variant="danger" size="md" onClick={handleDeleteAll}>
                  Delete all
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
