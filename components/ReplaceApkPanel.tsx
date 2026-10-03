"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { replaceBuildApk } from "@/app/actions/storage";
import { detectInspector } from "@/lib/apkInspector";
import { uploadApk, type RetryInfo, type StorageProviderKind } from "@/lib/uploadApk";
import { Field, Textarea } from "@/components/ui/Field";
import { Button, TextLinkButton } from "@/components/ui/Button";
import terminal from "@/components/ui/terminal.module.css";
import styles from "./CreateBuildForm.module.css";

type Phase = "idle" | "uploading" | "saving";
type ApkInfo = { versionName?: string; versionCode?: string };

const MAX_APK_BYTES = 500 * 1024 * 1024;

function formatMb(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Replace the APK behind an existing build — same build, same links. Shown
 * only to the developer who published the build.
 */
export function ReplaceApkPanel({
  buildId,
  applicationId,
  buildVersion,
  buildNumber,
  hasInspector: currentInspector,
  storageName,
  storageProvider,
  linkedIssueCount,
}: {
  buildId: string;
  applicationId: string;
  buildVersion: string;
  buildNumber: string;
  hasInspector: boolean;
  storageName: string | null;
  storageProvider: StorageProviderKind | null;
  linkedIssueCount: number;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scanId = useRef(0);

  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [apkInfo, setApkInfo] = useState<ApkInfo | null>(null);
  const [scanning, setScanning] = useState(false);
  const [hasInspector, setHasInspector] = useState(currentInspector);
  const [note, setNote] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [retry, setRetry] = useState<RetryInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notifyIssues, setNotifyIssues] = useState(true);
  // Outcome of the last replace's GitHub comments, shown after the panel closes.
  const [commentResult, setCommentResult] = useState<{ tone: "ok" | "warn"; text: string } | null>(null);

  const busy = phase !== "idle";

  function reset() {
    scanId.current++;
    setFile(null);
    setApkInfo(null);
    setScanning(false);
    setHasInspector(currentInspector);
    setNote("");
    setError(null);
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function pickFile(f: File | null) {
    setError(null);
    scanId.current++;
    setFile(null);
    setApkInfo(null);
    if (!f) return;
    if (!/\.apk$/i.test(f.name)) {
      setError(`"${f.name}" is not an APK.`);
      return;
    }
    if (f.size > MAX_APK_BYTES) {
      setError(`This APK is ${formatMb(f.size)} — the limit is 500 MB.`);
      return;
    }

    setFile(f);
    setScanning(true);
    const id = ++scanId.current;
    const current = () => id === scanId.current;
    import("app-info-parser/src/apk")
      .then(({ default: ApkParser }) => {
        const parser = new ApkParser(f);
        parser
          .getEntries([/^androidmanifest\.xml$/i])
          .then((buffers) => {
            const manifest = Object.values(buffers)[0];
            if (manifest && current()) setHasInspector(detectInspector(manifest));
          })
          .catch(() => {});
        return parser.parse().then((info) => {
          if (!current()) return;
          setApkInfo({
            versionName: info.versionName || undefined,
            versionCode:
              info.versionCode !== undefined && String(info.versionCode).trim()
                ? String(info.versionCode)
                : undefined,
          });
        });
      })
      .catch(() => current() && setApkInfo({}))
      .finally(() => current() && setScanning(false));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!storageProvider) {
      setError("No storage is connected for this application.");
      return;
    }
    if (!file || scanning || busy) return;

    try {
      setPhase("uploading");
      setProgress(0);
      const { storageConnectionId, storageObjectKey } = await uploadApk(
        applicationId,
        storageProvider,
        file,
        { onProgress: setProgress, onRetry: setRetry }
      );

      setPhase("saving");
      const fd = new FormData();
      fd.set("buildId", buildId);
      if (note.trim()) fd.set("note", note);
      fd.set("storageConnectionId", storageConnectionId);
      fd.set("storageObjectKey", storageObjectKey);
      fd.set("apkFileName", file.name);
      fd.set("apkSizeBytes", String(file.size));
      fd.set("hasInspector", String(hasInspector));
      fd.set("notifyIssues", String(notifyIssues && linkedIssueCount > 0));

      const result = await replaceBuildApk(fd);
      if (!result.ok) {
        setPhase("idle");
        setError(result.message);
        return;
      }

      const c = result.comments;
      setCommentResult(
        !c
          ? null
          : c.skipped
            ? { tone: "warn", text: `APK replaced, but no GitHub comment was sent: ${c.skipped}` }
            : c.failed.length > 0
              ? {
                  tone: "warn",
                  text: `APK replaced. Commented on ${c.posted} issue${c.posted === 1 ? "" : "s"}; failed on ${c.failed.join(", ")}.`,
                }
              : { tone: "ok", text: `APK replaced. Commented on ${c.posted} linked issue${c.posted === 1 ? "" : "s"}.` }
      );
      setPhase("idle");
      reset();
      setOpen(false);
      router.refresh();
    } catch (err) {
      setRetry(null);
      setPhase("idle");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (!open) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          block
          onClick={() => {
            setCommentResult(null);
            setOpen(true);
          }}
        >
          Replace APK
        </Button>
        {commentResult && (
          <p
            className={commentResult.tone === "ok" ? styles.msgHint : styles.msgWarn}
            role="status"
          >
            {commentResult.text}
          </p>
        )}
      </div>
    );
  }

  const versionMismatch = !!apkInfo?.versionName && apkInfo.versionName !== buildVersion;
  const numberMismatch = !!apkInfo?.versionCode && apkInfo.versionCode !== buildNumber;

  return (
    <form onSubmit={onSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <p className={styles.msgHint} style={{ lineHeight: 1.6 }}>
        Uploads a new APK into this same build. The download and share links stay the same;
        the old file is removed.
      </p>

      {file ? (
        <div className={styles.fileCard}>
          <div className={styles.fileTop}>
            <div className={styles.fileBadge}>APK</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className={styles.fileName}>{file.name}</div>
              <div className={styles.fileMeta}>
                {formatMb(file.size)}
                {scanning
                  ? " · reading…"
                  : apkInfo?.versionName || apkInfo?.versionCode
                    ? ` · v${apkInfo.versionName ?? "?"} (${apkInfo.versionCode ?? "?"})`
                    : ""}
              </div>
            </div>
            {!busy && (
              <TextLinkButton type="button" onClick={() => fileInputRef.current?.click()}>
                Change
              </TextLinkButton>
            )}
          </div>
          {busy && (
            <div className={styles.progress}>
              <div
                className={styles.progressBar}
                style={{ width: `${phase === "saving" ? 100 : progress}%` }}
              />
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          className={terminal.dropZone}
          disabled={!storageProvider}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const dropped = e.dataTransfer.files?.[0];
            if (dropped) pickFile(dropped);
          }}
        >
          <span style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
            {storageProvider ? "Drop the new APK here, or browse" : "No storage connected"}
          </span>
          <span style={{ display: "block", fontSize: 12, color: "var(--muted)" }}>
            {storageProvider ? `.apk only, up to 500 MB · uploads to ${storageName}` : ""}
          </span>
        </button>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept=".apk,application/vnd.android.package-archive"
        style={{ display: "none" }}
        onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
      />

      {(versionMismatch || numberMismatch) && (
        <p className={styles.msgWarn}>
          This APK is v{apkInfo?.versionName ?? "?"} ({apkInfo?.versionCode ?? "?"}), but the build
          is v{buildVersion} ({buildNumber}). The build keeps its version and number — publish a
          new build instead if this is a different release.
        </p>
      )}

      <Field
        label={
          <>
            Update note <span className={styles.optional}>optional</span>
          </>
        }
      >
        <Textarea
          value={note}
          placeholder={"Fixed crash on login\nUpdated staging API URL"}
          onChange={(e) => setNote(e.target.value)}
          disabled={busy}
        />
        <span className={styles.msgHint}>What changed in this APK — one change per line.</span>
      </Field>

      <label className={styles.toggleRow}>
        <input
          type="checkbox"
          className={styles.checkbox}
          checked={hasInspector}
          onChange={(e) => setHasInspector(e.target.checked)}
          disabled={busy}
        />
        <span className={styles.toggleTitle}>Includes Inspector</span>
      </label>

      {linkedIssueCount > 0 && (
        <label className={styles.toggleRow}>
          <input
            type="checkbox"
            className={styles.checkbox}
            checked={notifyIssues}
            onChange={(e) => setNotifyIssues(e.target.checked)}
            disabled={busy}
          />
          <span style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <span className={styles.toggleTitle}>
              Comment on {linkedIssueCount} linked issue{linkedIssueCount === 1 ? "" : "s"}
            </span>
            <span className={styles.msgHint}>
              Posts an &ldquo;APK updated&rdquo; comment with the note above, under your GitHub account.
            </span>
          </span>
        </label>
      )}

      {retry && (
        <span className={styles.msgWarn} role="status">
          Connection dropped ({retry.reason}) — resuming, attempt {retry.attempt} of {retry.max}.
        </span>
      )}
      {error && <p className={styles.formError}>{error}</p>}

      <div style={{ display: "flex", gap: 8 }}>
        <Button type="submit" variant="primary" size="md" disabled={!file || scanning || busy}>
          {phase === "uploading"
            ? `Uploading ${progress}%`
            : phase === "saving"
              ? "Saving…"
              : "Replace APK"}
        </Button>
        {!busy && (
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={() => {
              reset();
              setOpen(false);
            }}
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
