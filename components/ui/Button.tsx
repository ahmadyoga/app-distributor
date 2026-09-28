import type { ButtonHTMLAttributes } from "react";
import Link from "next/link";
import styles from "./terminal.module.css";

type Variant = "primary" | "ghost" | "danger" | "disabled";
type Size = "sm" | "md" | "lg";

const VARIANT_CLASS: Record<Variant, string> = {
  primary: styles.btnPrimary,
  ghost: styles.btnGhost,
  danger: styles.btnDanger,
  disabled: styles.btnDisabled,
};
const SIZE_CLASS: Record<Size, string> = {
  sm: styles.btnSm,
  md: styles.btnMd,
  lg: styles.btnLg,
};

export function buttonClassName(
  variant: Variant,
  size: Size,
  block?: boolean,
  className?: string
) {
  return [
    styles.btn,
    VARIANT_CLASS[variant],
    SIZE_CLASS[size],
    block ? styles.btnBlock : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  block?: boolean;
};

export function Button({
  variant = "ghost",
  size = "md",
  block,
  className,
  disabled,
  ...rest
}: Props) {
  return (
    <button
      className={buttonClassName(
        disabled ? "disabled" : variant,
        size,
        block,
        className
      )}
      disabled={disabled}
      {...rest}
    />
  );
}

export function LinkButton({
  href,
  variant = "ghost",
  size = "md",
  block,
  className,
  scroll,
  children,
}: {
  href: string;
  /** Pass false to keep the scroll position (e.g. "show more" on the same page). */
  scroll?: boolean;
  variant?: Variant;
  size?: Size;
  block?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      scroll={scroll}
      className={buttonClassName(variant, size, block, className)}
    >
      {children}
    </Link>
  );
}

export function TextLinkButton(
  props: ButtonHTMLAttributes<HTMLButtonElement>
) {
  return <button className={styles.linkBtn} {...props} />;
}
