import styles from "./terminal.module.css";

export type Tone = "ok" | "warn" | "muted";

const TONE_CLASS: Record<Tone, string> = {
  ok: styles.tagOk,
  warn: styles.tagWarn,
  muted: styles.tagMuted,
};

/** Renders `[LABEL]` uppercase, matching the mockup's terminal-direction tag(). */
export function StatusTag({
  tone,
  children,
  className,
  style,
}: {
  tone: Tone;
  children: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className={[styles.tag, TONE_CLASS[tone], className ?? ""].join(" ")}
      style={style}
    >
      [{children.toUpperCase()}]
    </span>
  );
}

export function toneForBuildStatus(status: "PROCESSING" | "PUBLISHED"): Tone {
  return status === "PUBLISHED" ? "ok" : "warn";
}

export function toneForEnvironment(environment: "PRODUCTION" | "STAGING"): Tone {
  return environment === "PRODUCTION" ? "ok" : "warn";
}
