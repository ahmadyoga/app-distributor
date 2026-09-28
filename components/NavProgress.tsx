"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import styles from "./NavProgress.module.css";

/**
 * Thin bar at the top of the viewport from the moment an internal link is
 * clicked until the new route commits, so a slow server render never looks
 * like a dead click.
 */
export function NavProgress() {
  const pathname = usePathname();
  const [active, setActive] = useState<string | null>(null);

  // Route committed: stop the bar.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setActive(null);
  }

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element).closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname.startsWith("/api/")) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      setActive(url.pathname);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // Safety net: never leave the bar stuck if a navigation is abandoned.
  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => setActive(null), 15000);
    return () => clearTimeout(t);
  }, [active]);

  return (
    <div
      className={[styles.bar, active ? styles.active : ""].join(" ")}
      role="progressbar"
      aria-hidden={!active}
      aria-label="Loading page"
    />
  );
}
