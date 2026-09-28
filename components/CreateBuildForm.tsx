"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ApkParser from "app-info-parser/src/apk";
import {
  presignS3Upload,
  createGDriveUploadSession,
  finalizeBuild,
} from "@/app/actions/storage";
import { detectInspector } from "@/lib/apkInspector";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Button, TextLinkButton } from "@/components/ui/Button";
import { StatusTag } from "@/components/ui/StatusTag";
import terminal from "@/components/ui/terminal.module.css";
import styles from "./CreateBuildForm.module.css";
import { TicketPicker, type TicketRef } from "@/components/TicketPicker";

type Phase = "idle" | "uploading" | "finalizing" | "done" | "error";
type Environment = "PRODUCTION" | "STAGING";
type ApkInfo = { versionName?: string; versionCode?: string; packageName?: string };

const MAX_APK_BYTES = 500 * 1024 * 1024;

function xhrPut(
  url: string,
  file: File,
  contentType: string,
  onProgress: (pct: number) => void,
  extraHeaders?: Record<string, string>
): Promise<XMLHttpRequest> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url, true);
    xhr.setRequestHeader("Content-Type", contentType);
    for (const [k, v] of Object.entries(extraHeaders ?? {})) {
      xhr.setRequestHeader(k, v);
    }
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve(xhr);
      else reject(new Error(`Upload failed (HTTP ${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("Upload failed — network error"));
    xhr.send(file);
  });
}

function formatMb(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function SectionHead({
  step,
  title,
  desc,
}: {
  step: string;
  title: string;
  desc: string;
}) {
  return (
    <>
      <div className={styles.sectionHead}>
        <span className={styles.step}>{step}</span>
        <h2 className={styles.sectionTitle}>{title}</h2>
      </div>
      <p className={styles.sectionDesc}>{desc}</p>
    </>
  );
}

export function CreateBuildForm({
  applicationId,
  storageName,
  storageProvider,
  suggestedVersion,
  suggestedNumber,
  lastNumber,
  existingNumbers,
}: {
  applicationId: string;
  storageName: string | null;
  storageProvider: "GOOGLE_DRIVE" | "S3_COMPATIBLE" | null;
  suggestedVersion: string;
  suggestedNumber: string;
  lastNumber: string | null;
  existingNumbers: string[];
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [apkInfo, setApkInfo] = useState<ApkInfo | null>(null);
  const [version, setVersion] = useState(suggestedVersion);
  const [number, setNumber] = useState(suggestedNumber);
  const [environment, setEnvironment] = useState<Environment | null>(null);
  const [hasInspector, setHasInspector] = useState(false);
  const [inspectorDetected, setInspectorDetected] = useState<boolean | null>(null);
  const [feature, setFeature] = useState("");
  const [featureTouched, setFeatureTouched] = useState(false);
  const [tickets, setTickets] = useState<TicketRef[]>([]);
  const [releaseNotes, setReleaseNotes] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [scanning, setScanning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [attempted, setAttempted] = useState(false);

  function clearFile() {
    setFile(null);
    setApkInfo(null);
    setInspectorDetected(null);
    setHasInspector(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function pickFile(f: File | null) {
    setFileError(null);
    clearFile();
    if (!f) return;

    if (!/\.apk$/i.test(f.name)) {
      setFileError(`"${f.name}" is not an APK. Only .apk files can be published.`);
      return;
    }
    if (f.size > MAX_APK_BYTES) {
      setFileError(`This APK is ${formatMb(f.size)} — the limit is 500 MB.`);
      return;
    }

    setFile(f);
    setScanning(true);
    const parser = new ApkParser(f);
    parser
      .parse()
      .then((info) => {
        const next: ApkInfo = {
          versionName: info.versionName || undefined,
          versionCode:
            info.versionCode !== undefined && String(info.versionCode).trim()
              ? String(info.versionCode)
              : undefined,
          packageName: info.package || undefined,
        };
        setApkInfo(next);
        if (next.versionName) setVersion(next.versionName);
        if (next.versionCode) setNumber(next.versionCode);
      })
      .catch(() => setApkInfo({}))
      .finally(() => setScanning(false));

    parser
      .getEntries([/^androidmanifest\.xml$/i])
      .then((buffers) => {
        const manifestBuffer = Object.values(buffers)[0];
        if (!manifestBuffer) return;
        const detected = detectInspector(manifestBuffer);
        setInspectorDetected(detected);
        setHasInspector(detected);
      })
      .catch(() => {
        // Best-effort only — the user can still set it manually.
      });
  }

  function onTicketsChange(next: TicketRef[]) {
    setTickets(next);
    // Seed the feature from the first linked issue until the user types their own.
    if (!featureTouched && next.length > 0) setFeature(next[0].title);
    if (!featureTouched && next.length === 0) setFeature("");
  }

  // Derived validation
  const trimmedNumber = number.trim();
  const isDuplicate = !!trimmedNumber && existingNumbers.includes(trimmedNumber);
  const isLowerThanLast =
    !isDuplicate &&
    !!lastNumber &&
    /^\d+$/.test(lastNumber) &&
    /^\d+$/.test(trimmedNumber) &&
    Number(trimmedNumber) <= Number(lastNumber);
  const versionMismatch =
    !!apkInfo?.versionName && version.trim() !== apkInfo.versionName;
  // Catches "v1.0.37" or "Build 51" typed where the feature name belongs.
  const featureLooksLikeVersion =
    /^\s*(v(ersion)?\s*)?\d+(\.\d+)+\s*$/i.test(feature) ||
    /^\s*build\s*#?\d+\s*$/i.test(feature) ||
    (!!feature.trim() && feature.trim().replace(/^v/i, "") === version.trim());
  const numberMismatch =
    !!apkInfo?.versionCode && trimmedNumber !== apkInfo.versionCode;

  const checks = [
    { key: "apk", label: "APK selected", done: !!file && !scanning },
    { key: "version", label: "Version", done: !!version.trim() },
    { key: "number", label: "Unique build number", done: !!trimmedNumber && !isDuplicate },
    { key: "environment", label: "Environment chosen", done: !!environment },
    { key: "feature", label: "Feature or work reference", done: !!feature.trim() },
  ];
  const ready = checks.every((c) => c.done) && !!storageProvider;
  const busy = phase === "uploading" || phase === "finalizing";

  const errFor = (key: string) =>
    fieldErrors[key]?.[0] ??
    (attempted && !checks.find((c) => c.key === key)?.done ? "Required." : null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setAttempted(true);

    if (!storageProvider) {
      setError("No storage is connected for this application. Connect a storage provider first.");
      return;
    }
    if (!ready || !file || !environment || busy) return;

    try {
      setPhase("uploading");
      setProgress(0);

      let storageConnectionId: string;
      let storageObjectKey: string;

      const contentType = file.type || "application/vnd.android.package-archive";

      if (storageProvider === "S3_COMPATIBLE") {
        const presigned = await presignS3Upload(applicationId, file.name, contentType);
        await xhrPut(presigned.uploadUrl, file, contentType, setProgress);
        storageConnectionId = presigned.storageConnectionId;
        storageObjectKey = presigned.objectKey;
      } else {
        const session = await createGDriveUploadSession(applicationId, file.name, contentType);
        const xhr = await xhrPut(session.uploadUrl, file, contentType, setProgress);
        const body = JSON.parse(xhr.responseText) as { id: string };
        storageConnectionId = session.storageConnectionId;
        storageObjectKey = body.id;
      }

      setPhase("finalizing");

      const fd = new FormData();
      fd.set("applicationId", applicationId);
      fd.set("version", version.trim());
      fd.set("number", trimmedNumber);
      fd.set("feature", feature.trim());
      if (tickets.length > 0) fd.set("tickets", JSON.stringify(tickets));
      if (releaseNotes.trim()) fd.set("releaseNotes", releaseNotes);
      fd.set("storageConnectionId", storageConnectionId);
      fd.set("storageObjectKey", storageObjectKey);
      fd.set("apkFileName", file.name);
      fd.set("apkSizeBytes", String(file.size));
      fd.set("hasInspector", String(hasInspector));
      fd.set("environment", environment);

      const result = await finalizeBuild(fd);

      if (!result.ok) {
        setPhase("idle");
        setError(result.message ?? "Could not publish this build — check the highlighted fields.");
        if (result.errors) setFieldErrors(result.errors);
        return;
      }

      setPhase("done");
      router.push(`/apps/${result.appSlug}/builds/${result.id}`);
    } catch (err) {
      setPhase("idle");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  const versionErr = errFor("version");
  const numberErr = isDuplicate
    ? `Build ${trimmedNumber} already exists for this app. Bump versionCode and rebuild.`
    : errFor("number");
  const featureErr = errFor("feature");
  const envErr = errFor("environment");
  const apkErr = fileError ?? errFor("apk");

  return (
    <form onSubmit={onSubmit} className={styles.layout} noValidate>
      <div className={styles.main}>
        {/* 01 — APK */}
        <section className={styles.section}>
          <SectionHead
            step="01"
            title="APK"
            desc="Start here. Version, build number and Inspector usage are read from the APK's manifest."
          />

          {file ? (
            <div className={styles.fileCard}>
              <div className={styles.fileTop}>
                <div className={styles.fileBadge}>APK</div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className={styles.fileName}>{file.name}</div>
                  <div className={styles.fileMeta}>
                    {formatMb(file.size)}
                    {storageName ? ` · uploads to ${storageName}` : ""}
                  </div>
                </div>
                {!busy && (
                  <TextLinkButton type="button" onClick={() => fileInputRef.current?.click()}>
                    Replace
                  </TextLinkButton>
                )}
              </div>
              <div className={styles.fileFacts}>
                <div className={styles.fact}>
                  <div className={styles.factKey}>versionName</div>
                  <div className={styles.factVal}>
                    {scanning ? "Reading…" : apkInfo?.versionName ?? "Not found"}
                  </div>
                </div>
                <div className={styles.fact}>
                  <div className={styles.factKey}>versionCode</div>
                  <div className={styles.factVal}>
                    {scanning ? "Reading…" : apkInfo?.versionCode ?? "Not found"}
                  </div>
                </div>
                <div className={styles.fact}>
                  <div className={styles.factKey}>Package</div>
                  <div className={styles.factVal}>
                    {scanning ? "Reading…" : apkInfo?.packageName ?? "Not found"}
                  </div>
                </div>
              </div>
              {busy && (
                <div className={styles.progress}>
                  <div
                    className={styles.progressBar}
                    style={{ width: `${phase === "finalizing" ? 100 : progress}%` }}
                  />
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              className={[terminal.dropZone, isDragging ? styles.dropZoneActive : ""].join(" ")}
              style={apkErr ? { borderColor: "var(--danger)" } : undefined}
              disabled={!storageProvider}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const dropped = e.dataTransfer.files?.[0];
                if (dropped) pickFile(dropped);
              }}
            >
              <span style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
                {storageProvider ? "Drop the APK here, or browse" : "No storage connected"}
              </span>
              <span style={{ display: "block", fontSize: 12, color: "var(--muted)" }}>
                {storageProvider
                  ? `.apk only, up to 500 MB · uploads to ${storageName}`
                  : "Connect a storage provider from the Storage page before publishing."}
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
          {apkErr && <p className={styles.msgError} style={{ marginTop: 8 }}>{apkErr}</p>}
          {file && !scanning && apkInfo && !apkInfo.versionName && !apkInfo.versionCode && (
            <p className={styles.msgWarn} style={{ marginTop: 8 }}>
              Couldn&apos;t read version info from this APK — enter it manually below.
            </p>
          )}
        </section>

        {/* 02 — Identity */}
        <section className={styles.section}>
          <SectionHead
            step="02"
            title="Build identity"
            desc="How testers find this exact APK. The build number must be unique within the app; the version can repeat."
          />
          <div className={styles.stack}>
            <div className={styles.row2}>
              <Field
                label={
                  <span className={styles.labelRow}>
                    Version
                    {apkInfo?.versionName && !versionMismatch && (
                      <span className={styles.fromApk}>[FROM APK]</span>
                    )}
                  </span>
                }
              >
                <Input
                  mono
                  value={version}
                  placeholder="2.4.0"
                  onChange={(e) => setVersion(e.target.value)}
                  disabled={scanning || busy}
                  className={versionErr ? styles.inputError : ""}
                />
                {versionErr ? (
                  <span className={styles.msgError}>{versionErr}</span>
                ) : versionMismatch ? (
                  <span className={styles.msgWarn}>
                    Differs from the APK&apos;s versionName ({apkInfo?.versionName}).
                  </span>
                ) : (
                  <span className={styles.msgHint}>versionName, e.g. 2.4.0</span>
                )}
              </Field>

              <Field
                label={
                  <span className={styles.labelRow}>
                    Build number
                    {apkInfo?.versionCode && !numberMismatch && (
                      <span className={styles.fromApk}>[FROM APK]</span>
                    )}
                  </span>
                }
              >
                <Input
                  mono
                  inputMode="numeric"
                  value={number}
                  placeholder={lastNumber ? String(Number(lastNumber) + 1 || "") : "1"}
                  onChange={(e) => setNumber(e.target.value)}
                  disabled={scanning || busy}
                  className={numberErr ? styles.inputError : ""}
                />
                {numberErr ? (
                  <span className={styles.msgError}>{numberErr}</span>
                ) : numberMismatch ? (
                  <span className={styles.msgWarn}>
                    Differs from the APK&apos;s versionCode ({apkInfo?.versionCode}).
                  </span>
                ) : isLowerThanLast ? (
                  <span className={styles.msgWarn}>
                    Not higher than the last published build ({lastNumber}).
                  </span>
                ) : (
                  <span className={styles.msgHint}>
                    versionCode{lastNumber ? ` · last published was ${lastNumber}` : ""}
                  </span>
                )}
              </Field>
            </div>

            <div className={terminal.field}>
              <span className={terminal.fieldLabel} id="env-label">
                Environment
              </span>
              <div
                role="radiogroup"
                aria-labelledby="env-label"
                className={[styles.segment, envErr ? styles.segmentError : ""].join(" ")}
              >
                <label className={`${styles.segOption} ${styles.segStaging}`}>
                  <input
                    type="radio"
                    name="environment"
                    value="STAGING"
                    checked={environment === "STAGING"}
                    onChange={() => setEnvironment("STAGING")}
                    disabled={busy}
                  />
                  <span className={styles.segName}>Staging</span>
                  <span className={styles.segDesc}>Points at staging APIs — for QA and internal testing.</span>
                </label>
                <label className={`${styles.segOption} ${styles.segProd}`}>
                  <input
                    type="radio"
                    name="environment"
                    value="PRODUCTION"
                    checked={environment === "PRODUCTION"}
                    onChange={() => setEnvironment("PRODUCTION")}
                    disabled={busy}
                  />
                  <span className={styles.segName}>Production</span>
                  <span className={styles.segDesc}>Points at live APIs — release candidates and real users.</span>
                </label>
              </div>
              {envErr && <span className={styles.msgError}>Pick which backend this APK talks to.</span>}
            </div>

            <label className={styles.toggleRow}>
              <input
                type="checkbox"
                className={styles.checkbox}
                checked={hasInspector}
                onChange={(e) => setHasInspector(e.target.checked)}
                disabled={busy}
              />
              <span style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <span className={styles.toggleTitle}>Includes Inspector</span>
                <span className={styles.msgHint}>
                  {inspectorDetected === true
                    ? "Detected in the APK manifest. Uncheck only if detection is wrong."
                    : inspectorDetected === false
                      ? "Not detected in the APK manifest."
                      : "Debug inspector bundled in the build. Flagged with an [INSPECTOR] tag so it isn't shipped by mistake."}
                </span>
              </span>
            </label>
          </div>
        </section>

        {/* 03 — Context */}
        <section className={styles.section}>
          <SectionHead
            step="03"
            title="Context"
            desc="Answers “what is this APK for?” — the feature becomes the build's title in every list."
          />
          <div className={styles.stack}>
            <div className={terminal.field}>
              <span className={terminal.fieldLabel}>
                GitHub issues <span className={styles.optional}>optional</span>
              </span>
              <TicketPicker tickets={tickets} onChange={onTicketsChange} />
              <span className={styles.msgHint}>
                Each linked issue gets a comment with this build&apos;s download link.
              </span>
            </div>

            <Field label="Feature or work reference">
              <Input
                value={feature}
                placeholder="e.g. Checkout flow"
                maxLength={120}
                onChange={(e) => {
                  setFeature(e.target.value);
                  setFeatureTouched(true);
                }}
                disabled={busy}
                className={featureErr ? styles.inputError : ""}
              />
              {featureErr ? (
                <span className={styles.msgError}>{featureErr}</span>
              ) : featureLooksLikeVersion ? (
                <span className={styles.msgWarn}>
                  This looks like a version number. Describe the work instead, e.g. “Laporan BSK”.
                </span>
              ) : (
                <span className={styles.msgHint}>
                  {tickets.length > 0 && !featureTouched
                    ? "Filled from the first linked issue — edit to shorten."
                    : "A short name testers recognise."}
                </span>
              )}
            </Field>

            <Field
              label={
                <>
                  Release notes <span className={styles.optional}>optional</span>
                </>
              }
            >
              <Textarea
                value={releaseNotes}
                placeholder={"Added Apple Pay to checkout\nFixed crash when cart is empty"}
                onChange={(e) => setReleaseNotes(e.target.value)}
                disabled={busy}
              />
              <span className={styles.msgHint}>One change per line — each line shows as a bullet.</span>
            </Field>
          </div>
        </section>
      </div>

      {/* Summary */}
      <aside className={styles.aside}>
        <div className={styles.asideHead}>
          <div className={styles.asideLabel}>Publishes as</div>
          <div className={styles.asideIdent}>
            <span className={terminal.buildNo}>{trimmedNumber || "—"}</span>
            <span className={terminal.versionTag}>v{version.trim() || "—"}</span>
          </div>
          <div
            className={[styles.asideFeature, feature.trim() ? "" : styles.asideFeatureEmpty].join(" ")}
          >
            {feature.trim() || "No feature yet"}
          </div>
          {(environment || hasInspector) && (
            <div className={styles.asideTags}>
              {environment && (
                <StatusTag tone={environment === "PRODUCTION" ? "ok" : "warn"}>{environment}</StatusTag>
              )}
              {hasInspector && <StatusTag tone="warn">Inspector</StatusTag>}
            </div>
          )}
        </div>

        <ul className={styles.checklist}>
          {checks.map((c) => (
            <li
              key={c.key}
              className={[styles.checkItem, c.done ? styles.checkItemDone : ""].join(" ")}
            >
              <span className={styles.checkMark}>{c.done ? "✓" : "·"}</span>
              {c.label}
            </li>
          ))}
        </ul>

        <div className={styles.asideMeta}>
          <span>
            Storage: <strong>{storageName ?? "none connected"}</strong>
          </span>
          {tickets.length > 0 && (
            <span>
              Comments on{" "}
              <strong>
                {tickets.length} issue{tickets.length === 1 ? "" : "s"}
              </strong>
            </span>
          )}
          {releaseNotes.trim() && (
            <span>
              <strong>{releaseNotes.split("\n").filter((l) => l.trim()).length}</strong> release note lines
            </span>
          )}
        </div>

        <div className={styles.asideFoot}>
          <Button type="submit" variant="primary" size="lg" block disabled={busy || !storageProvider}>
            {phase === "uploading"
              ? `Uploading ${progress}%`
              : phase === "finalizing"
                ? "Publishing…"
                : "Publish build"}
          </Button>
          {!busy && !ready && !error && (
            <span className={styles.status}>
              {checks.filter((c) => !c.done).length} item
              {checks.filter((c) => !c.done).length === 1 ? "" : "s"} left before publishing.
            </span>
          )}
          {error && <p className={styles.formError}>{error}</p>}
        </div>
      </aside>
    </form>
  );
}
