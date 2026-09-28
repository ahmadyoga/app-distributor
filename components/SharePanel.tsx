"use client";

import { useState, useTransition } from "react";
import { generateShareToken, revokeShareToken } from "@/app/actions/apps";
import { Button, TextLinkButton } from "@/components/ui/Button";
import { SectionLabel } from "@/components/ui/Field";
import styles from "./SharePanel.module.css";

export function SharePanel({
  buildId,
  initialUrl,
  canManage,
}: {
  buildId: string;
  initialUrl: string | null;
  canManage: boolean;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [copied, setCopied] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard can be blocked (e.g. after an await on Safari) — the link
      // stays visible and selectable, so the user can copy it by hand.
    }
  }

  function create() {
    setError(null);
    startTransition(async () => {
      try {
        const next = await generateShareToken(buildId);
        setUrl(next);
        await copy(next);
      } catch {
        setError("Couldn't create the link. Try again.");
      }
    });
  }

  function revoke() {
    setError(null);
    startTransition(async () => {
      try {
        await revokeShareToken(buildId);
        setUrl(null);
        setConfirmRevoke(false);
      } catch {
        setError("Couldn't disable the link. Try again.");
      }
    });
  }

  return (
    <div className={styles.panel}>
      <SectionLabel>Public link</SectionLabel>

      {url ? (
        <>
          <div className={styles.linkRow}>
            <input
              className={styles.linkInput}
              value={url}
              readOnly
              onFocus={(e) => e.currentTarget.select()}
              aria-label="Public share link"
            />
            <Button type="button" size="sm" variant="primary" onClick={() => copy(url)}>
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <p className={styles.note}>
            Anyone with this link can download the APK without signing in.
          </p>
          <div className={styles.actions}>
            <a href={url} target="_blank" rel="noreferrer" className={styles.action}>
              Preview page ↗
            </a>
            {canManage &&
              (confirmRevoke ? (
                <span className={styles.confirm}>
                  <span>Old link stops working.</span>
                  <TextLinkButton
                    type="button"
                    onClick={revoke}
                    disabled={pending}
                    style={{ color: "var(--danger)" }}
                  >
                    {pending ? "Disabling…" : "Disable"}
                  </TextLinkButton>
                  <TextLinkButton type="button" onClick={() => setConfirmRevoke(false)}>
                    Keep
                  </TextLinkButton>
                </span>
              ) : (
                <TextLinkButton
                  type="button"
                  onClick={() => setConfirmRevoke(true)}
                  style={{ color: "var(--muted)" }}
                >
                  Disable link
                </TextLinkButton>
              ))}
          </div>
        </>
      ) : canManage ? (
        <>
          <p className={styles.note}>
            Create a link for testers or stakeholders who don&apos;t have a BuildApp account.
            It can be disabled at any time.
          </p>
          <Button type="button" size="sm" onClick={create} disabled={pending}>
            {pending ? "Creating…" : "Create public link"}
          </Button>
        </>
      ) : (
        <p className={styles.note}>
          No public link yet. Ask a publisher to create one.
        </p>
      )}

      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
