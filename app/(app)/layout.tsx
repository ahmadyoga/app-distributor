import { getCurrentUser } from "@/lib/dal";
import { logout } from "@/app/actions/auth";
import { Logo } from "@/components/ui/Misc";
import { DevAvatar } from "@/components/ui/Tile";
import { StatusTag } from "@/components/ui/StatusTag";
import { NavLink } from "@/components/ui/NavLink";
import { GridIcon, AppsIcon, StorageIcon, KeyIcon } from "@/components/ui/icons";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { NavProgress } from "@/components/NavProgress";
import styles from "./shell.module.css";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const readOnly = user.role === "VIEWER";

  return (
    <div className={styles.shell}>
      <NavProgress />
      <div className={styles.topbar}>
        <Logo />
        <div className={styles.topbarRight}>
          <StatusTag tone={readOnly ? "muted" : "ok"}>
            {readOnly ? "Viewer" : "Publisher"}
          </StatusTag>
          <div className={styles.userBlock}>
            <DevAvatar name={user.name} large />
            <div>
              <div className={styles.userName}>{user.name}</div>
              <div className={styles.userRole}>
                {readOnly ? "Read-only access" : "Mobile developer"}
              </div>
            </div>
          </div>
          <form action={logout}>
            <SubmitButton link pendingLabel="Signing out…">
              Sign out
            </SubmitButton>
          </form>
        </div>
      </div>

      <div className={styles.body}>
        <nav className={styles.sidebar}>
          <NavLink href="/" exact icon={<GridIcon />}>
            Overview
          </NavLink>
          <NavLink href="/apps" icon={<AppsIcon />}>
            Applications
          </NavLink>
          <NavLink href="/storage" icon={<StorageIcon />}>
            Storage
          </NavLink>
          <NavLink href="/settings" icon={<KeyIcon />}>
            GitHub token
          </NavLink>
        </nav>

        <div className={styles.main}>{children}</div>
      </div>
    </div>
  );
}
