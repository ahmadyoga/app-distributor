"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addBuildTickets } from "@/app/actions/storage";
import { TicketPicker, type TicketRef } from "@/components/TicketPicker";
import { Button } from "@/components/ui/Button";
import styles from "./CreateBuildForm.module.css";

/** Link more GitHub issues to a published build — each gets the build comment. */
export function AddTicketsPanel({
  buildId,
  linkedKeys,
}: {
  buildId: string;
  /** `repo#number` of issues already linked, so they can't be picked twice. */
  linkedKeys: string[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tickets, setTickets] = useState<TicketRef[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ tone: "ok" | "warn"; text: string } | null>(null);

  const already = tickets.filter((t) => linkedKeys.includes(`${t.repo}#${t.number}`));
  const fresh = tickets.filter((t) => !linkedKeys.includes(`${t.repo}#${t.number}`));

  async function onSave() {
    if (fresh.length === 0 || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await addBuildTickets(buildId, fresh);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setResult(
        res.failed.length > 0
          ? {
              tone: "warn",
              text: `Linked ${res.added} issue${res.added === 1 ? "" : "s"}. Comment failed on ${res.failed.join(", ")}.`,
            }
          : {
              tone: "ok",
              text: `Linked ${res.added} issue${res.added === 1 ? "" : "s"} and posted the build comment.`,
            }
      );
      setTickets([]);
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setResult(null);
            setOpen(true);
          }}
        >
          + Link issues
        </Button>
        {result && (
          <p className={result.tone === "ok" ? styles.msgHint : styles.msgWarn} role="status">
            {result.text}
          </p>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <TicketPicker tickets={tickets} onChange={setTickets} />
      <span className={styles.msgHint}>
        Each newly linked issue gets a comment with this build&apos;s download link, under your
        GitHub account.
      </span>
      {already.length > 0 && (
        <span className={styles.msgWarn}>
          Already linked, will be skipped: {already.map((t) => `${t.repo}#${t.number}`).join(", ")}
        </span>
      )}
      {error && <p className={styles.formError}>{error}</p>}
      <div style={{ display: "flex", gap: 8 }}>
        <Button type="button" variant="primary" size="sm" disabled={fresh.length === 0 || saving} onClick={onSave}>
          {saving
            ? "Linking…"
            : fresh.length > 0
              ? `Link ${fresh.length} issue${fresh.length === 1 ? "" : "s"}`
              : "Link issues"}
        </Button>
        {!saving && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setTickets([]);
              setError(null);
              setOpen(false);
            }}
          >
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
