"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./terminal.module.css";

export function NavLink({
  href,
  exact,
  icon,
  children,
}: {
  href: string;
  exact?: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={[styles.navLink, active ? styles.navLinkActive : ""].join(" ")}
    >
      {icon}
      <span>{children}</span>
    </Link>
  );
}
