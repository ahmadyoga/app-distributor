"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ApkParser from "app-info-parser/src/apk";
import {
  presignS3Upload,
  createGDriveUploadSession,
  finalizeBuild,
} from "@/app/actions/storage";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Button, TextLinkButton } from "@/components/ui/Button";
import terminal from "@/components/ui/terminal.module.css";

type Phase = "idle" | "uploading" | "finalizing" | "done" | "error";

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

export function CreateBuildForm({
  applicationId,
  applicationName,
  storageName,
  storageProvider,
  suggestedVersion,
  suggestedNumber,
  lastNumber,
}: {
  applicationId: string;
  applicationName: string;
  storageName: string | null;
  storageProvider: "GOOGLE_DRIVE" | "S3_COMPATIBLE" | null;
  suggestedVersion: string;
  suggestedNumber: string;
  lastNumber: string | null;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [version, setVersion] = useState(suggestedVersion);
  const [number, setNumber] = useState(suggestedNumber);
  const [feature, setFeature] = useState("");
  const [githubIssue, setGithubIssue] = useState("");
  const [releaseNotes, setReleaseNotes] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [scanning, setScanning] = useState(false);
  const [scanNote, setScanNote] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  function pickFile(f: File | null) {
    setFile(f);
    setScanNote(null);
    if (!f) return;

    setScanning(true);
    new ApkParser(f)
      .parse()
      .then((info) => {
        const filled: string[] = [];
        if (info.versionName) {
          setVersion(info.versionName);
          filled.push("version");
        }
        if (info.versionCode !== undefined && String(info.versionCode).trim()) {
          setNumber(String(info.versionCode));
          filled.push("build number");
        }
        setScanNote(
          filled.length
            ? `Read ${filled.join(" and ")} from the APK.`
            : "Couldn't find version info in this APK — enter it manually."
        );
      })
      .catch(() => {
        setScanNote(
          "Couldn't scan this file automatically — enter version and build number manually."
        );
      })
      .finally(() => setScanning(false));
  }

  const canSubmit =
    !!file &&
    !!version &&
    !!number &&
    !!feature &&
    !!storageProvider &&
    phase === "idle" &&
    !scanning;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    if (!file) {
      setError("Choose an APK file to upload.");
      return;
    }
    if (!storageProvider) {
      setError(
        "No storage is connected for this application. Connect a storage provider first."
      );
      return;
    }

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
        const session = await createGDriveUploadSession(
          applicationId,
          file.name,
          contentType
        );
        const xhr = await xhrPut(session.uploadUrl, file, contentType, setProgress);
        const body = JSON.parse(xhr.responseText) as { id: string };
        storageConnectionId = session.storageConnectionId;
        storageObjectKey = body.id;
      }

      setPhase("finalizing");

      const fd = new FormData();
      fd.set("applicationId", applicationId);
      fd.set("version", version);
      fd.set("number", number);
      fd.set("feature", feature);
      if (githubIssue) fd.set("githubIssue", githubIssue);
      if (releaseNotes) fd.set("releaseNotes", releaseNotes);
      fd.set("storageConnectionId", storageConnectionId);
      fd.set("storageObjectKey", storageObjectKey);
      fd.set("apkFileName", file.name);
      fd.set("apkSizeBytes", String(file.size));

      const result = await finalizeBuild(fd);

      if (!result.ok) {
        setPhase("error");
        setError(result.message ?? "Could not publish this build.");
        if (result.errors) setFieldErrors(result.errors);
        return;
      }

      setPhase("done");
      router.push(`/apps/${result.appSlug}/builds/${result.number}`);
    } catch (err) {
      setPhase("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  const busy = phase === "uploading" || phase === "finalizing";

  return (
    <form
      onSubmit={onSubmit}
      style={{
        border: "var(--bw) solid var(--line)",
        borderRadius: "var(--r-md)",
        background: "var(--card)",
        padding: 22,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))",
          gap: 14,
          marginBottom: 14,
        }}
      >
        <Field label="Application">
          <div
            style={{
              height: 42,
              display: "flex",
              alignItems: "center",
              padding: "0 13px",
              border: "var(--bw) solid var(--line)",
              borderRadius: "var(--r-sm)",
              background: "var(--surface-2)",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            {applicationName}
          </div>
        </Field>
        <Field label="Version">
          <Input
            mono
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            disabled={scanning}
            required
          />
        </Field>
        <Field
          label="Build number"
          hint={lastNumber ? `Last published was ${lastNumber}.` : undefined}
        >
          <Input
            mono
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            disabled={scanning}
            required
          />
        </Field>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
          gap: 14,
          marginBottom: 14,
        }}
      >
        <Field label="Feature or work reference">
          <Input value={feature} onChange={(e) => setFeature(e.target.value)} required />
        </Field>
        <Field
          label={
            <>
              GitHub issue{" "}
              <span style={{ fontWeight: 400, color: "var(--muted)" }}>optional</span>
            </>
          }
        >
          <Input
            mono
            value={githubIssue}
            onChange={(e) => setGithubIssue(e.target.value)}
            placeholder="#182"
          />
        </Field>
      </div>

      <div style={{ marginBottom: 14, display: "flex", flexDirection: "column", gap: 6 }}>
        <span className={terminal.fieldLabel}>APK</span>
        {file ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "13px 14px",
              border: "var(--bw) solid var(--line)",
              borderRadius: "var(--r-sm)",
              background: "var(--surface-2)",
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                flex: "none",
                borderRadius: "var(--r-sm)",
                background: "var(--ok-bg)",
                color: "var(--ok)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                fontWeight: 600,
                border: "1px solid var(--ok)",
              }}
            >
              APK
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  fontWeight: 500,
                  overflowWrap: "anywhere",
                }}
              >
                {file.name}
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>
                {(file.size / 1024 / 1024).toFixed(1)} MB
                {storageName ? `, uploads to ${storageName}` : ""}
              </div>
            </div>
            {!busy && (
              <TextLinkButton
                type="button"
                onClick={() => {
                  pickFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              >
                Replace
              </TextLinkButton>
            )}
          </div>
        ) : (
          <button
            type="button"
            className={terminal.dropZone}
            style={
              isDragging
                ? { borderColor: "var(--accent)", background: "var(--surface-2)" }
                : undefined
            }
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
            <span style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 3 }}>
              Drop the APK here, or browse
            </span>
            <span style={{ display: "block", fontSize: 12, color: "var(--muted)" }}>
              {storageName
                ? `Uploads to ${storageName}, up to 500 MB — version and build number are read from the APK automatically`
                : "No storage connected — connect one from the Storage page first"}
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
        {scanning && (
          <span style={{ fontSize: 11, color: "var(--muted)" }}>Scanning APK…</span>
        )}
        {!scanning && scanNote && (
          <span style={{ fontSize: 11, color: "var(--accent)" }}>{scanNote}</span>
        )}
      </div>

      {busy && (
        <div style={{ marginBottom: 14 }}>
          <div
            style={{
              height: 4,
              borderRadius: 999,
              background: "var(--surface-2)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${phase === "finalizing" ? 100 : progress}%`,
                height: "100%",
                background: "var(--accent)",
                transition: "width .15s ease",
              }}
            />
          </div>
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
            {phase === "uploading"
              ? `Uploading… ${progress}%`
              : "Publishing build…"}
          </p>
        </div>
      )}

      <Field
        label={
          <>
            Release notes{" "}
            <span style={{ fontWeight: 400, color: "var(--muted)" }}>optional</span>
          </>
        }
      >
        <Textarea
          value={releaseNotes}
          onChange={(e) => setReleaseNotes(e.target.value)}
        />
      </Field>

      {(error || Object.keys(fieldErrors).length > 0) && (
        <p style={{ fontSize: 13, color: "var(--danger)", marginTop: 14 }}>
          {error ?? Object.values(fieldErrors)[0]?.[0]}
        </p>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          paddingTop: 18,
          marginTop: 16,
          borderTop: "var(--bw) solid var(--line)",
        }}
      >
        <span style={{ fontSize: 12, color: "var(--muted)" }}>
          Publishes as{" "}
          <span style={{ fontFamily: "var(--font-mono)", color: "var(--ink)", fontWeight: 600 }}>
            Build {number || "—"} / v{version || "—"}
          </span>
        </span>
        <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
          <Button type="submit" variant="primary" size="lg" disabled={!canSubmit}>
            {busy ? "Publishing…" : "Publish build"}
          </Button>
        </div>
      </div>
    </form>
  );
}
