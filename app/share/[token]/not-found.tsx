import { Logo } from "@/components/ui/Misc";
import styles from "./share.module.css";

export default function ShareNotFound() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Logo />
        <span className={styles.headerNote}>Shared build</span>
      </header>
      <main className={styles.main}>
        <h1 className={styles.feature}>This link doesn&apos;t work anymore</h1>
        <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.65 }}>
          The team may have disabled it, or the build was removed. Ask whoever sent it for a
          new link.
        </p>
      </main>
    </div>
  );
}
