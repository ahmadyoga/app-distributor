import { Skeleton } from "@/components/ui/Misc";
import { CardSkeleton } from "@/components/ui/Skeletons";
import styles from "./build.module.css";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading build">
      <div className={styles.topbar}>
        <Skeleton width="240px" height="12px" />
      </div>
      <div className={styles.grid}>
        <div className={styles.left}>
          <div className={styles.headRow}>
            <Skeleton width="52px" height="52px" />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Skeleton width="180px" height="24px" />
              <Skeleton width="90px" height="12px" />
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Skeleton width="260px" height="28px" />
            <Skeleton width="70%" height="22px" />
            <Skeleton width="100%" height="34px" />
          </div>
          <CardSkeleton lines={4} />
        </div>
        <div className={styles.right}>
          <div className={styles.downloadCard} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Skeleton width="100%" height="46px" />
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} width="100%" height="14px" />
            ))}
          </div>
          <CardSkeleton lines={3} />
        </div>
      </div>
    </div>
  );
}
