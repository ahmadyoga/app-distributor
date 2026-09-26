import styles from "./terminal.module.css";

const SIZE_CLASS = {
  sm: styles.tileSm,
  md: styles.tileMd,
  lg: styles.tileLg,
};

export function Tile({
  size = "md",
  className,
  children,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={[styles.tile, SIZE_CLASS[size], className ?? ""].join(" ")}>
      {children}
    </div>
  );
}

export function DevAvatar({
  name,
  large,
  className,
}: {
  name: string;
  large?: boolean;
  className?: string;
}) {
  return (
    <div
      className={[
        styles.devAvatar,
        large ? styles.devAvatarLg : "",
        className ?? "",
      ].join(" ")}
      title={name}
    >
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}
