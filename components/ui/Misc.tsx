import styles from "./terminal.module.css";
import { LockIcon, LogoIcon } from "./icons";

export function BannerWarn({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.bannerWarn}>
      <LockIcon />
      <div style={{ fontSize: 13, lineHeight: 1.55 }}>{children}</div>
    </div>
  );
}

export function Skeleton({ width, height }: { width: string; height: string }) {
  return <div className={styles.skeleton} style={{ width, height }} />;
}

export function OptionCard({
  title,
  subtitle,
  onClick,
}: {
  title: string;
  subtitle: string;
  onClick?: () => void;
}) {
  return (
    <button type="button" className={styles.optionCard} onClick={onClick}>
      <span style={{ fontSize: 14, fontWeight: 600 }}>{title}</span>
      <span style={{ fontSize: 11, color: "var(--muted)" }}>{subtitle}</span>
    </button>
  );
}

export function Logo({ withLabel = true }: { withLabel?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
      <div
        style={{
          width: 26,
          height: 26,
          borderRadius: "var(--r-sm)",
          background: "var(--primary-bg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <LogoIcon size={14} />
      </div>
      {withLabel && (
        <span style={{ fontWeight: 600, fontSize: 15, letterSpacing: "-0.02em" }}>
          BuildApp
        </span>
      )}
    </div>
  );
}
