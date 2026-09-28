import { Logo, Skeleton } from "@/components/ui/Misc";
import styles from "./share.module.css";

export default function Loading() {
  return (
    <div className={styles.page} aria-busy="true" aria-label="Loading build">
      <header className={styles.header}>
        <Logo />
        <span className={styles.headerNote}>Shared build</span>
      </header>
      <main className={styles.main} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
          <Skeleton width="52px" height="52px" />
          <Skeleton width="160px" height="18px" />
        </div>
        <Skeleton width="70%" height="30px" />
        <Skeleton width="240px" height="28px" />
        <div className={styles.download}>
          <Skeleton width="100%" height="46px" />
        </div>
      </main>
    </div>
  );
}
