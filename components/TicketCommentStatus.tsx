"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./TicketCommentStatus.module.css";

type TicketStatus = {
  id: string;
  repo: string;
  number: number;
  title: string;
  commentStatus: "PENDING" | "POSTED" | "FAILED";
  commentError: string | null;
};

type ToastItem = {
  key: string;
  repo: string;
  number: number;
  title: string;
  status: "POSTED" | "FAILED";
  error: string | null;
  visible: boolean;
};

export function TicketCommentStatus({
  buildId,
  buildCreatedAt,
}: {
  buildId: string;
  buildCreatedAt: Date;
}) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const seenIds = useRef<Set<string>>(new Set());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Only show toasts for builds created within the last 2 minutes
  const isRecent = Date.now() - new Date(buildCreatedAt).getTime() < 2 * 60 * 1000;

  function dismissToast(key: string) {
    setToasts((prev) =>
      prev.map((t) => (t.key === key ? { ...t, visible: false } : t))
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.key !== key));
    }, 300);
  }

  useEffect(() => {
    // Hard timeout — stop polling after 30 seconds regardless
    const timeoutId = setTimeout(() => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }, 30_000);

    async function poll() {
      try {
        const res = await fetch(`/api/builds/${buildId}/comment-status`);
        if (!res.ok) return;
        const data = (await res.json()) as {
          tickets: TicketStatus[];
          allSettled: boolean;
        };

        if (isRecent) {
          const newToasts: ToastItem[] = [];
          for (const t of data.tickets) {
            if (t.commentStatus === "PENDING") continue;
            if (seenIds.current.has(t.id)) continue;
            seenIds.current.add(t.id);
            newToasts.push({
              key: t.id,
              repo: t.repo,
              number: t.number,
              title: t.title,
              status: t.commentStatus as "POSTED" | "FAILED",
              error: t.commentError,
              visible: true,
            });
          }

          if (newToasts.length > 0) {
            setToasts((prev) => [...prev, ...newToasts]);
            for (const toast of newToasts) {
              if (toast.status === "POSTED") {
                setTimeout(() => dismissToast(toast.key), 6000);
              }
            }
          }
        }

        if (data.allSettled) {
          clearTimeout(timeoutId);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      } catch {
        // silently ignore
      }
    }

    poll();
    intervalRef.current = setInterval(poll, 2000);
    return () => {
      clearTimeout(timeoutId);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [buildId, isRecent]);

  if (toasts.length === 0) return null;

  return (
    <div className={styles.container}>
      {toasts.map((toast) => (
        <div
          key={toast.key}
          className={[
            styles.toast,
            toast.status === "POSTED" ? styles.toastOk : styles.toastFail,
            toast.visible ? styles.toastIn : styles.toastOut,
          ].join(" ")}
        >
          <div className={styles.toastIcon}>
            {toast.status === "POSTED" ? "✓" : "✕"}
          </div>
          <div className={styles.toastBody}>
            <span className={styles.toastRef}>
              {toast.repo}#{toast.number}
            </span>
            <span className={styles.toastMsg}>
              {toast.status === "POSTED"
                ? "Comment posted"
                : `Comment failed${toast.error ? ` — ${toast.error}` : ""}`}
            </span>
          </div>
          <button
            type="button"
            className={styles.toastClose}
            onClick={() => dismissToast(toast.key)}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
