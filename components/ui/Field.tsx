import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import styles from "./terminal.module.css";

export function Field({
  label,
  hint,
  children,
}: {
  label: React.ReactNode;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      {children}
      {hint && <span style={{ fontSize: 11, color: "var(--muted)" }}>{hint}</span>}
    </label>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h3 className={styles.sectionLabel}>{children}</h3>;
}

export function Input({
  mono,
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { mono?: boolean }) {
  return (
    <input
      className={[styles.input, mono ? styles.inputMono : "", className ?? ""].join(
        " "
      )}
      {...rest}
    />
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={styles.textarea} {...props} />;
}
