"use client";

import { useEffect, useRef, useState } from "react";
import { buttonClassName } from "@/components/ui/Button";
import { DownloadIcon } from "@/components/ui/icons";
import styles from "./DownloadButton.module.css";

type Phase = "idle" | "preparing" | "slow" | "started";

const COOKIE_PREFIX = "dl_"; // matches DOWNLOAD_COOKIE_PREFIX on the server
const SLOW_AFTER_MS = 8000;
const GIVE_UP_AFTER_MS = 60000;

function readAndClearCookie(name: string) {
  const found = document.cookie.split("; ").some((c) => c.startsWith(`${name}=`));
  if (found) document.cookie = `${name}=; path=/; max-age=0`;
  return found;
}

/**
 * Download link that shows the file is being prepared. The APK can take
 * several seconds to start (Drive files are proxied through the server), and
 * a plain link gives no feedback in that gap.
 */
export function DownloadButton({ href }: { href: string }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);

  function clearAll() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (poll.current) clearInterval(poll.current);
    poll.current = null;
  }
  useEffect(() => clearAll, []);

  function start(e: React.MouseEvent<HTMLAnchorElement>) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    if (phase === "preparing" || phase === "slow") return;

    clearAll();
    const id = Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) =>
      b.toString(16).padStart(2, "0")
    ).join("");
    const cookie = `${COOKIE_PREFIX}${id}`;
    setPhase("preparing");

    poll.current = setInterval(() => {
      if (readAndClearCookie(cookie)) {
        clearAll();
        setPhase("started");
        timers.current.push(setTimeout(() => setPhase("idle"), 4000));
      }
    }, 250);
    timers.current.push(setTimeout(() => setPhase((p) => (p === "preparing" ? "slow" : p)), SLOW_AFTER_MS));
    // If no signal ever comes (e.g. cookies blocked), don't spin forever.
    timers.current.push(
      setTimeout(() => {
        clearAll();
        setPhase("idle");
      }, GIVE_UP_AFTER_MS)
    );

    const url = `${href}${href.includes("?") ? "&" : "?"}dl=${id}`;
    // A file download from an API route, not a page navigation — the router
    // can't handle it, and the current page stays in place.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(url);
  }

  const busy = phase === "preparing" || phase === "slow";

  return (
    <div>
      <a
        href={href}
        onClick={start}
        aria-busy={busy}
        aria-disabled={busy}
        className={[buttonClassName("primary", "lg", true), busy ? styles.busy : ""].join(" ")}
      >
        {busy ? (
          <>
            <span className={styles.spinner} aria-hidden /> Preparing download…
          </>
        ) : phase === "started" ? (
          <>✓ Download started</>
        ) : (
          <>
            <DownloadIcon /> Download APK
          </>
        )}
      </a>
      <p className={styles.status} role="status" aria-live="polite">
        {phase === "preparing" && "Fetching the APK from storage — this can take a few seconds."}
        {phase === "slow" && "Still working — large APKs take longer. Keep this page open."}
        {phase === "started" && "Check your browser's downloads or the notification bar."}
      </p>
    </div>
  );
}
